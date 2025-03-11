import express from 'express';
import { query } from '../db/index.js';
import authenticateToken from '../middleware/auth.js';
import { format } from 'date-fns';

const router = express.Router();

// Apply authentication middleware to all habit routes
router.use(authenticateToken);

// Get all habits for the current user
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM habits WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    
    // Process habits to ensure they have the correct structure
    const processedHabits = result.rows.map(habit => {
      // Convert completion_history (snake_case) to completionHistory (camelCase) and ensure it's an array
      let completionHistory = [];
      if (habit.completion_history) {
        try {
          // If it's a string, parse it
          if (typeof habit.completion_history === 'string') {
            completionHistory = JSON.parse(habit.completion_history);
          } else {
            // Otherwise, assume it's already an object
            completionHistory = habit.completion_history;
          }
        } catch (e) {
          console.error('Error parsing completion_history:', e);
        }
      }
      
      return {
        ...habit,
        completionHistory: Array.isArray(completionHistory) ? completionHistory : []
      };
    });
    
    res.json(processedHabits);
  } catch (error) {
    console.error('Get habits error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific habit
router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM habits WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Habit not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get habit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new habit
router.post('/', async (req, res) => {
  try {
    const {
      name,
      category,
      identity,
      clearFramework
    } = req.body;

    console.log('Creating new habit:', { name, category, identity });

    const result = await query(
      `INSERT INTO habits (
        user_id, name, category, identity, streak, completed, completion_history, clear_framework
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        req.user.id, name, category, identity, 0, false, JSON.stringify([]), clearFramework
      ]
    );

    // Process the habit for frontend compatibility
    const habit = result.rows[0];
    
    // Ensure completionHistory is always an array in the response
    let completionHistory = [];
    try {
      if (typeof habit.completion_history === 'string') {
        completionHistory = JSON.parse(habit.completion_history);
      } else if (habit.completion_history) {
        completionHistory = habit.completion_history;
      }
    } catch (e) {
      console.error('Error parsing completion_history:', e);
    }
    
    const processedHabit = {
      ...habit,
      completionHistory: Array.isArray(completionHistory) ? completionHistory : []
    };
    
    console.log('Habit created successfully:', processedHabit.id);
    res.status(201).json(processedHabit);
  } catch (error) {
    console.error('Create habit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a habit
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      category,
      identity,
      streak,
      completed,
      completionHistory,
      clearFramework
    } = req.body;

    // Check if the habit exists and belongs to the user
    const checkResult = await query('SELECT * FROM habits WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    const result = await query(
      `UPDATE habits SET
        name = $1, category = $2, identity = $3, streak = $4, completed = $5,
        completion_history = $6, clear_framework = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 AND user_id = $9
      RETURNING *`,
      [
        name, category, identity, streak, completed,
        JSON.stringify(completionHistory), clearFramework, req.params.id, req.user.id
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update habit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle a habit's completion status
router.put('/:id/toggle', async (req, res) => {
  try {
    // Get the habit
    const habitResult = await query('SELECT * FROM habits WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    
    if (habitResult.rows.length === 0) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    const habit = habitResult.rows[0];
    const newCompleted = !habit.completed;
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Update completion history
    let completionHistory = habit.completion_history || [];
    const todayIndex = completionHistory.findIndex(h => h.date === today);
    
    if (todayIndex >= 0) {
      completionHistory[todayIndex] = { date: today, completed: newCompleted };
    } else {
      completionHistory.unshift({ date: today, completed: newCompleted });
    }

    // Calculate streak
    let streak = 0;
    if (newCompleted) {
      for (const completion of [...completionHistory].sort((a, b) => b.date.localeCompare(a.date))) {
        if (completion.completed) streak++;
        else break;
      }
    }

    // Update the habit
    const result = await query(
      `UPDATE habits SET
        completed = $1, completion_history = $2, streak = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND user_id = $5
      RETURNING *`,
      [newCompleted, JSON.stringify(completionHistory), streak, req.params.id, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Toggle habit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a habit
router.delete('/:id', async (req, res) => {
  try {
    // Check if the habit exists and belongs to the user
    const checkResult = await query('SELECT * FROM habits WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    await query('DELETE FROM habits WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    
    res.json({ message: 'Habit deleted successfully' });
  } catch (error) {
    console.error('Delete habit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset daily habits
router.post('/reset-daily', async (req, res) => {
  try {
    await query(
      `UPDATE habits SET
        completed = false,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1`,
      [req.user.id]
    );
    
    res.json({ message: 'Daily habits reset successfully' });
  } catch (error) {
    console.error('Reset daily habits error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 