const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Subject = require('../models/Subject');
const auth = require('../middleware/auth');

// @route   GET api/attendance/subject/:subjectId
// @desc    Get attendance records for a specific subject
// @access  Private
router.get('/subject/:subjectId', auth, async (req, res) => {
  try {
    // First check if the subject belongs to the user
    const subject = await Subject.findOne({
      _id: req.params.subjectId,
      user: req.user.userId
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const attendance = await Attendance.find({
      subject: req.params.subjectId,
      user: req.user.userId
    }).sort({ date: -1 });
    
    res.json(attendance);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/attendance
// @desc    Mark attendance for a subject
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { subjectId, date, status } = req.body;

    // Check if the subject belongs to the user
    const subject = await Subject.findOne({
      _id: subjectId,
      user: req.user.userId
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Check if attendance already exists for this date
    const existingAttendance = await Attendance.findOne({
      subject: subjectId,
      user: req.user.userId,
      date: new Date(date)
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'Attendance already marked for this date' });
    }

    // Create new attendance record
    const attendance = new Attendance({
      subject: subjectId,
      user: req.user.userId,
      date: new Date(date),
      status
    });

    await attendance.save();

    // Update subject statistics
    subject.totalClasses += 1;
    if (status === 'present') {
      subject.attendedClasses += 1;
    }
    subject.attendancePercentage = (subject.attendedClasses / subject.totalClasses) * 100;
    await subject.save();

    res.status(201).json(attendance);
  } catch (error) {
    console.error('Error marking attendance:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Attendance already marked for this date' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE api/attendance/:id
// @desc    Delete an attendance record
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const attendance = await Attendance.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    // Update subject statistics
    const subject = await Subject.findById(attendance.subject);
    if (subject) {
      subject.totalClasses -= 1;
      if (attendance.status === 'present') {
        subject.attendedClasses -= 1;
      }
      if (subject.totalClasses > 0) {
        subject.attendancePercentage = (subject.attendedClasses / subject.totalClasses) * 100;
      } else {
        subject.attendancePercentage = 0;
      }
      await subject.save();
    }

    await attendance.deleteOne();
    res.json({ message: 'Attendance record removed' });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 