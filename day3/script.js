let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

function searchNotes(word) {
  const searchWord = word.toLowerCase();
  return notes.filter(note => note.text.toLowerCase().includes(searchWord));
}

function longestNote() {
  if (notes.length === 0) {
    return null;
  }
  
  let longest = notes[0];
  for (let i = 1; i < notes.length; i++) {
    if (notes[i].text.length > longest.text.length) {
      longest = notes[i];
    }
  }
  return longest;
}

function countByCategory() {
  const counts = {};
  for (let note of notes) {
    if (counts[note.category]) {
      counts[note.category]++;
    } else {
      counts[note.category] = 1;
    }
  }
  return counts;
}

function getSummary() {
  const counts = countByCategory();
  const total = notes.length;
  const noteWord = total === 1 ? "note" : "notes";
  
  const categoryStrings = [];
  for (const [category, count] of Object.entries(counts)) {
    categoryStrings.push(`${count} ${category}`);
  }
  
  return `${total} ${noteWord}: ${categoryStrings.join(", ")}.`;
}

function isDuplicate(text) {
  const cleanText = text.trim().toLowerCase();
  return notes.some(note => note.text.toLowerCase() === cleanText);
}

function addNote(text, category) {
  if (text.length < 1 || text.length > 200) {
    console.log("Failed to add note: Text must be between 1 and 200 characters.");
    return false;
  }
  
  if (isDuplicate(text)) {
    console.log("Failed to add note: Duplicate text found.");
    return false;
  }
  
  if (category !== "personal" && category !== "work" && category !== "study") {
    console.log("Failed to add note: Category must be personal, work, or study.");
    return false;
  }
  
  const newId = notes.length > 0 ? Math.max(...notes.map(n => n.id)) + 1 : 1;
  notes.push({ id: newId, text: text, category: category });
  return true;
}

// --- Tests ---

// searchNotes
console.log(searchNotes("day")); // Expected: [{id: 2, text: "Finish the Day 3 assignment", category: "study"}]
console.log(searchNotes("gym")); // Expected: []

// longestNote
console.log(longestNote()); // Expected: {id: 3, text: "Email the project report to Grace", category: "work"}
const backupNotes = notes; 
notes = []; 
console.log(longestNote()); // Expected: null
notes = backupNotes; // Restore notes

// countByCategory
console.log(countByCategory()); // Expected: { personal: 2, study: 2, work: 1 }
notes.push({ id: 99, text: "Temp note", category: "work" });
console.log(countByCategory()); // Expected: { personal: 2, study: 2, work: 2 }
notes.pop(); // Restore notes

// getSummary
console.log(getSummary()); // Expected: "5 notes: 2 personal, 2 study, 1 work."
notes = [{ id: 1, text: "Only one note", category: "personal" }];
console.log(getSummary()); // Expected: "1 note: 1 personal."
notes = backupNotes; // Restore notes

// isDuplicate
console.log(isDuplicate("  call MUM  ")); // Expected: true
console.log(isDuplicate("Walk the dog")); // Expected: false

// addNote
console.log(addNote("Read MDN docs", "study")); // Expected: true (Note added to array)
console.log(addNote("Call mum", "personal")); // Expected: false (Logs duplicate reason)
console.log(addNote("Go for a run", "fitness")); // Expected: false (Logs invalid category reason)
console.log(addNote("", "work")); // Expected: false (Logs length reason)