const Attendance = require('../models/Attendance');
const Subject = require('../models/Subject');

// @desc    Mark attendance for a subject
// @route   POST /api/attendance
// @access  Private
const markAttendance = async (req, res) => {
  try {
    const { subjectId, date, status } = req.body;

    // Check if subject exists and belongs to user
    const subject = await Subject.findOne({
      _id: subjectId,
      user: req.user._id,
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Check if attendance already exists for this date
    const existingAttendance = await Attendance.findOne({
      subject: subjectId,
      date: new Date(date),
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'Attendance already marked for this date' });
    }

    // Create attendance record
    const attendance = await Attendance.create({
      subject: subjectId,
      date: new Date(date),
      status,
      user: req.user._id,
    });

    // Update subject attendance stats
    subject.totalClasses += 1;
    if (status === 'present') {
      subject.attendedClasses += 1;
    }
    subject.attendancePercentage = (subject.attendedClasses / subject.totalClasses) * 100;
    await subject.save();

    res.status(201).json(attendance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get attendance history for a subject
// @route   GET /api/attendance/subject/:subjectId
// @access  Private
const getAttendanceHistory = async (req, res) => {
  try {
    const subject = await Subject.findOne({
      _id: req.params.subjectId,
      user: req.user._id,
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const attendance = await Attendance.find({ subject: req.params.subjectId })
      .sort({ date: -1 });

    res.json(attendance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete attendance record
// @route   DELETE /api/attendance/:id
// @access  Private
const deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    // Check if user owns the attendance record
    if (attendance.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Update subject attendance stats
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

    await Attendance.deleteOne({ _id: req.params.id });
    res.json({ message: 'Attendance record removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  markAttendance,
  getAttendanceHistory,
  deleteAttendance,
}; 