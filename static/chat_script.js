    
        const chatBody = document.getElementById('chatBody');
        const messageInput = document.getElementById('messageInput');
        const fileInput = document.getElementById('fileInput');
        const fileIndicator = document.getElementById('fileIndicator');
        const modal = document.getElementById('previewModal');
        const modalContent = document.getElementById('modalContent');

//
const socket = io("https://chaton-oc40.onrender.com", { transports: ["websocket", "polling"] });

const statusDiv = document.getElementById('status');  

const loader = document.getElementById('loader');

const partnerInfoDiv = document.getElementById('partner-info');
const startBtn = document.getElementById('startBtn');

//searching function      
function startSearch() {
  chatBody.innerHTML = '';
  partnerInfoDiv.textContent = '';
  messageInput.disabled = true;
  sendBtn.disabled = true;
  statusDiv.textContent = 'Searching...';
  loader.style.display = 'block';
  socket.emit('start_search');
}  

socket.on('searching', () => {
  loader.style.display = 'block';
  statusDiv.textContent = 'Searching...';
});

socket.on('chat_started', (data) => {
  loader.style.display = 'none';
  statusDiv.textContent = 'Next';
  partnerInfoDiv.textContent = `with: ${data.partner_name}`;
  messageInput.disabled = false;
  sendBtn.disabled = false;
  startBtn.disabled = false;
});

  socket.on('partner_left', () => {
        loader.style.display = 'none';
        statusDiv.textContent = 'Start';
        partnerInfoDiv.textContent = '';
        messageInput.disabled = true;
        sendBtn.disabled = true;
  });
  
socket.on('message', function(data) {
  setTimeout(() => {
  addMessage(data.text, data.is_user ? 'sent' : 'received');
  },10)
  });
//
        let selectedFiles = [];

        fileInput.addEventListener('change', (event) => {
            const files = event.target.files;
            selectedFiles = Array.from(files);
            
            if (selectedFiles.length > 0) {
                fileIndicator.textContent = `${selectedFiles.length} file(s) selected`;
            } else {
                fileIndicator.textContent = '';
            }
        });

        function addMessage(content, type, isFile = false) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${type}`;
            
            if (isFile) {
                messageDiv.innerHTML = content;
                setTimeout(() => {
                    const mediaElements = messageDiv.querySelectorAll('img, video');
                    mediaElements.forEach(element => {
                        element.addEventListener('click', () => openModal(element.cloneNode(true)));
                    });
                }, 0);
            } else {
                messageDiv.innerHTML = `
                    <div>${content}</div>
                    <div class="message-time">${getCurrentTime()}</div>
                `;
            }
            
            chatBody.appendChild(messageDiv);
            chatBody.scrollTop = chatBody.scrollHeight;
        }

        function getCurrentTime() {
            return new Date().toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
        }

        function sendMessage() {
            const text = messageInput.value.trim();
            
            if (selectedFiles.length > 0) {
                selectedFiles.forEach(file => {
                    let fileContent = '';
                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            fileContent = `
                                <div class="file-message">
                                    <img src="${e.target.result}" alt="Click to preview">
                                    <div class="message-time">${getCurrentTime()}</div>
                                </div>
                            `;
                            addMessage(fileContent, 'sent', true);
                        };
                        reader.readAsDataURL(file);
                    } else if (file.type.startsWith('video/')) {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            fileContent = `
                                <div class="file-message">
                                    <video>
                                        <source src="${e.target.result}" type="${file.type}">
                                        Your browser does not support the video tag.
                                    </video>
                                    <div class="message-time">${getCurrentTime()}</div>
                                </div>
                            `;
                            addMessage(fileContent, 'sent', true);
                        };
                        reader.readAsDataURL(file);
                    }
                });
                selectedFiles = [];
                fileIndicator.textContent = '';
            }
            
            if (text) {
                socket.emit('message', { message: text });
                messageInput.value = '';
                

            }
        }

        function openModal(element) {
            modalContent.innerHTML = '';
            modalContent.appendChild(element);
            
            if (element.tagName === 'VIDEO') {
                element.controls = true;
                element.play();
            }
            
            modal.classList.add('show');
        }

        function closeModal() {
            const video = modalContent.querySelector('video');
            if (video) {
                video.pause();
            }
            modal.classList.remove('show');
        }

        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeModal();
            }
        });

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        // Add initial messages
        //addMessage('Welcome to Modern Chat! 👋', 'received')
        //addMessage('Try sending a message or sharing files!', 'received');
