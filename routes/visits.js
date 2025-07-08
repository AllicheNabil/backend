const express = require('express');
const router = express.Router();
const { dbAll, dbRun } = require('../db');

// GET all visits for a patient
router.get('/:patientId', async (req, res) => {
    const patientId = req.params.patientId;
    try {
        const rows = await dbAll(`SELECT * FROM visits WHERE patient_id = ?`, [patientId]);
        res.json({
            "message": "success",
            "data": rows
        });
    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

// POST a new visit for a patient
router.post('/:patientId', async (req, res) => {
    const patientId = req.params.patientId;
    const { id: userId } = req.user; // Destructure to get user ID and rename to avoid conflict
    const {
        reason,
        physical_examination,
        weight,
        weight_percentile,
        height,
        height_percentile,
        head_circumference,
        head_circumference_percentile,
        bmi,
        diagnosis,
        visit_date,
        visit_hour
    } = req.body;

    const query = `
        INSERT INTO visits (
            patient_id, reason, physical_examination, weight, weight_percentile, height, height_percentile, 
            head_circumference, head_circumference_percentile, bmi, diagnosis, visit_date, visit_hour, userId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
        patientId, reason, physical_examination, weight, weight_percentile, height, height_percentile,
        head_circumference, head_circumference_percentile, bmi, diagnosis, visit_date, visit_hour, userId
    ];

    try {
        const result = await dbRun(query, params);
        res.json({
            "message": "success",
            "data": { id: result.lastID, ...req.body }
        });
    } catch (err) {
        res.status(400).json({ "error": err.message });
    }
});

module.exports = router;