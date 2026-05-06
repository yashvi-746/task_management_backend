const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, maxlength: 1000 },
  status: { type: String, enum: ['Todo', 'InProgress', 'Done'], default: 'Todo' },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  dueDate: { type: Date },
  board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Indexes for performance
taskSchema.index({ board: 1, status: 1 });
taskSchema.index({ board: 1, assignedTo: 1 });

module.exports = mongoose.model('Task', taskSchema);
