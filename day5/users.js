const loadUsersBtn = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusMsg = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

let users = [];

async function loadUsers() {
  loadUsersBtn.disabled = true;
  statusMsg.textContent = "Loading users...";
  usersList.innerHTML = "";

  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    users = await response.json();
    statusMsg.textContent = "Users loaded successfully.";
    
    // Clear filter input on new fetch
    filterInput.value = ""; 
    renderUsers(users);
  } catch (error) {
    statusMsg.textContent = "Error loading users. Please try again later.";
    console.error("Fetch error:", error);
  } finally {
    loadUsersBtn.disabled = false;
  }
}

function renderUsers(list) {
  usersList.innerHTML = "";
  
  if (list.length === 0 && users.length > 0) {
    statusMsg.textContent = "No users match your filter.";
    return;
  } else if (users.length > 0) {
    statusMsg.textContent = "Users loaded successfully.";
  }

  list.forEach(user => {
    const li = document.createElement("li");
    
    // Defensively trimming strings to prevent whitespace layout bugs
    const name = user.name.trim();
    const email = user.email.trim();
    const city = user.address.city.trim();
    const company = user.company.name.trim();
    
    li.textContent = `Name: ${name} | Email: ${email} | City: ${city} | Company: ${company}`;
    usersList.appendChild(li);
  });
}

loadUsersBtn.addEventListener("click", loadUsers);

filterInput.addEventListener("input", (e) => {
  const searchTerm = e.target.value.trim().toLowerCase();
  
  const filteredUsers = users.filter(user => 
    // Applying feedback from Day 3: Defensive trimming before case-insensitive comparison
    user.name.trim().toLowerCase().includes(searchTerm)
  );
  
  renderUsers(filteredUsers);
});