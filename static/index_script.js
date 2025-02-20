document.getElementById('chatForm').addEventListener('submit', function(e) {
      const genderSelected = document.querySelector('input[name="gender"]:checked');
      const errorMessage = document.getElementById('errorMessage');
      
      if (!genderSelected) {
        e.preventDefault();
        errorMessage.style.display = 'block';
      } else {
        errorMessage.style.display = 'none';
      }
    });
