import express from 'express';
import { query } from '../db/index.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all project routes
router.use(authenticateToken);

// Get all projects for the current user
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific project
router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new project
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      taskCount,
      progress,
      collaborators,
      color,
      startDate,
      endDate,
      phases,
      recurringSessions,
      mvg,
      nextAction
    } = req.body;

    // Ensure proper initialization of JSON fields
    const safePhases = phases || [];
    const safeRecurringSessions = recurringSessions || [];
    const safeMvg = mvg || {
      description: 'Define your minimum viable goal',
      completed: false,
      streak: 0,
      completionHistory: []
    };

    // If MVG doesn't have completionHistory, add it
    if (!safeMvg.completionHistory) {
      safeMvg.completionHistory = [];
    }

    // If MVG doesn't have streak, add it
    if (safeMvg.streak === undefined) {
      safeMvg.streak = 0;
    }

    console.log('Creating project with phases:', JSON.stringify(safePhases));
    console.log('Creating project with recurringSessions:', JSON.stringify(safeRecurringSessions));
    console.log('Creating project with mvg:', JSON.stringify(safeMvg));

    const result = await query(
      `INSERT INTO projects (
        user_id, title, description, task_count, progress, collaborators,
        color, start_date, end_date, phases, recurring_sessions, mvg, next_action
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        req.user.id, title, description, taskCount || 0, progress || 0, collaborators || 1,
        color || 'bg-purple-600', startDate, endDate, 
        JSON.stringify(safePhases), 
        JSON.stringify(safeRecurringSessions),
        JSON.stringify(safeMvg),
        nextAction
      ]
    );

    // Ensure the returned object has arrays where expected, not strings
    const project = result.rows[0];
    
    // Parse JSON strings to objects if they're stored as strings
    if (typeof project.phases === 'string') {
      project.phases = JSON.parse(project.phases);
    }
    
    if (typeof project.recurring_sessions === 'string') {
      project.recurring_sessions = JSON.parse(project.recurring_sessions);
    }
    
    if (typeof project.mvg === 'string') {
      project.mvg = JSON.parse(project.mvg);
    }

    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a project
router.put('/:id', async (req, res) => {
  try {
    const {
      title,
      description,
      taskCount,
      progress,
      collaborators,
      color,
      startDate,
      endDate,
      phases,
      recurringSessions,
      mvg,
      nextAction
    } = req.body;

    // Check if the project exists and belongs to the user
    const checkResult = await query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const result = await query(
      `UPDATE projects SET
        title = $1, description = $2, task_count = $3, progress = $4, collaborators = $5,
        color = $6, start_date = $7, end_date = $8, phases = $9, recurring_sessions = $10,
        mvg = $11, next_action = $12, updated_at = CURRENT_TIMESTAMP
      WHERE id = $13 AND user_id = $14
      RETURNING *`,
      [
        title, description, taskCount, progress, collaborators,
        color, startDate, endDate, JSON.stringify(phases), JSON.stringify(recurringSessions),
        JSON.stringify(mvg), nextAction, req.params.id, req.user.id
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a project
router.delete('/:id', async (req, res) => {
  try {
    // Check if the project exists and belongs to the user
    const checkResult = await query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 