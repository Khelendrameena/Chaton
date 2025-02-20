# app.py
from flask import Flask, render_template, request, session, redirect, CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import os
from datetime import datetime
import random

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key')
socketio = SocketIO(app, cors_allowed_origins="*")

# Store active users and their socket IDs
waiting_users = []  # [(user_id, username, socket_id)]
active_chats = {}  # {user_id: (partner_id, partner_username, room_id)}
user_sid = {}  # {user_id: socket_id} - Track socket IDs for direct messaging

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/enter', methods=['POST'])
def enter_chat():
    username = request.form.get('username')
    if not username:
        return redirect('/')
    
    session['user_id'] = f'user_{random.randint(10000, 99999)}'
    session['username'] = username
    return redirect('/chat')

@app.route('/chat')
def chat():
    if 'username' not in session:
        return redirect('/')
    return render_template('chat.html', username=session['username'])

@socketio.on('connect')
def handle_connect():
    user_id = session.get('user_id')
    if user_id:
        user_sid[user_id] = request.sid
        print(f"User {user_id} connected with socket ID {request.sid}")

@socketio.on('start_search')
def handle_search():
    user_id = session.get('user_id')
    username = session.get('username')
    socket_id = request.sid
    
    if not user_id or not username:
        return
    
    print(f"User {username} ({user_id}) started searching")
    
    # Clean up any existing chat
    if user_id in active_chats:
        old_partner_id, _, old_room = active_chats[user_id]
        if old_partner_id in active_chats:
            del active_chats[old_partner_id]
            if old_partner_id in user_sid:
                emit('partner_left', room=user_sid[old_partner_id])
        del active_chats[user_id]
    
    # Remove from waiting list if already there
    waiting_users[:] = [(uid, uname, sid) for uid, uname, sid in waiting_users if uid != user_id]
    
    # Try to find a partner
    if waiting_users:
        # Get the first waiting user
        partner_id, partner_username, partner_sid = waiting_users.pop(0)
        
        # Create a unique room
        room = f'room_{random.randint(1000, 9999)}'
        
        print(f"Matching {username} with {partner_username}")
        
        # Set up the chat for both users
        active_chats[user_id] = (partner_id, partner_username, room)
        active_chats[partner_id] = (user_id, username, room)
        
        # Notify the current user
        emit('chat_started', {
            'partner_name': partner_username
        }, room=socket_id)
        
        # Notify the partner using their socket ID
        emit('chat_started', {
            'partner_name': username
        }, room=partner_sid)
        
        print(f"Notified both users of match")
    else:
        # No partner available, add to waiting list
        waiting_users.append((user_id, username, socket_id))
        emit('searching', room=socket_id)
        print(f"Added {username} to waiting list")

@socketio.on('message')
def handle_message(data):
    user_id = session.get('user_id')
    username = session.get('username')
    
    if user_id not in active_chats:
        return
    
    partner_id, partner_username, room = active_chats[user_id]
    
    # Create message object
    message = {
        'text': data['message'],
        'sender_name': username,
        'timestamp': datetime.now().strftime('%H:%M')
    }
    
    print(f"Message from {username} to {partner_username}: {data['message']}")
    
    # Send to current user as 'sent' message
    emit('message', {**message, 'is_user': True}, room=request.sid)
    
    # Send to partner as 'received' message
    if partner_id in user_sid:
        emit('message', {**message, 'is_user': False}, room=user_sid[partner_id])
        print(f"Message delivered to {partner_username}")

@socketio.on('disconnect')
def handle_disconnect():
    user_id = session.get('user_id')
    if not user_id:
        return
    
    print(f"User {user_id} disconnected")
    
    # Remove socket ID mapping
    if user_id in user_sid:
        del user_sid[user_id]
    
    # Remove from waiting list
    waiting_users[:] = [(uid, uname, sid) for uid, uname, sid in waiting_users if uid != user_id]
    
    # Handle active chat disconnection
    if user_id in active_chats:
        partner_id, _, room = active_chats[user_id]
        if partner_id in active_chats:
            if partner_id in user_sid:
                emit('partner_left', room=user_sid[partner_id])
            del active_chats[partner_id]
        del active_chats[user_id]

if __name__ == '__main__':
    socketio.run(app, debug=True)
