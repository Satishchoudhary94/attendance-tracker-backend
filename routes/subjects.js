const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const auth = require('../middleware/auth');

// @route   GET api/subjects
// @desc    Get all subjects for the current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const subjects = await Subject.find({ user: req.user.userId });
    res.json(subjects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/subjects
// @desc    Create a new subject
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;

    // Check if subject with same name already exists for this user
    const existingSubject = await Subject.findOne({
      name,
      user: req.user.userId
    });

    if (existingSubject) {
      return res.status(400).json({ message: 'Subject with this name already exists' });
    }

    const subject = new Subject({
      name,
      user: req.user.userId
    });

    await subject.save();
    res.status(201).json(subject);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE api/subjects/:id
// @desc    Delete a subject
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const subject = await Subject.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    await subject.deleteOne();
    res.json({ message: 'Subject removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update subject statistics
router.patch('/:id/stats', async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const attendance = await Attendance.find({ subject: req.params.id });
    const totalClasses = attendance.length;
    const attendedClasses = attendance.filter(a => a.status === 'present').length;
    const attendancePercentage = totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;

    subject.totalClasses = totalClasses;
    subject.attendedClasses = attendedClasses;
    subject.attendancePercentage = attendancePercentage;

    const updatedSubject = await subject.save();
    res.json(updatedSubject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router; 