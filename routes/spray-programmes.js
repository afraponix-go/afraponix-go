const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get spray programmes for a system
router.get('/', async (req, res) => {
    const { system_id } = req.query;
    const db = getDatabase();

    if (!system_id) {
        return res.status(400).json({ error: 'System ID is required' });
    }

    try {
        const programmes = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    sp.*,
                    CASE 
                        WHEN COUNT(sa.id) > 0 THEN 1 
                        ELSE 0 
                    END as applied,
                    MAX(sa.application_date) as last_application_date
                FROM spray_programmes sp
                LEFT JOIN spray_applications sa ON sp.id = sa.programme_id
                WHERE sp.system_id = ? AND (sp.status = 'active' OR sp.status = 'inactive' OR sp.status IS NULL)
                GROUP BY sp.id
                ORDER BY sp.created_at DESC
            `, [system_id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Transform database format to match frontend expectations
        const transformedProgrammes = programmes.map(prog => ({
            id: prog.id,
            product_name: prog.product_name,
            programme: `${prog.category} - ${prog.product_name}`,
            products: prog.product_name,
            application_rate: prog.application_rate,
            target_areas: prog.target_pest || 'All growing areas',
            weather_conditions: 'Optimal conditions recommended',
            applied: Boolean(prog.applied),
            notes: prog.notes || '',
            category: prog.category,
            active_ingredient: prog.active_ingredient,
            frequency: prog.frequency,
            frequency_days: prog.frequency_days || (prog.frequency ? parseInt(prog.frequency.match(/\d+/) || [7])[0] : null),
            start_date: prog.start_date,
            end_date: prog.end_date,
            last_application: prog.last_application_date,
            status: prog.status || 'active' // Include status field, default to active
        }));

        // Debug: Log status distribution
        const statusCount = transformedProgrammes.reduce((acc, prog) => {
            acc[prog.status] = (acc[prog.status] || 0) + 1;
            return acc;
        }, {});
        console.log('📊 Spray programmes status distribution:', statusCount);
        console.log('🔍 Inactive programmes:', transformedProgrammes.filter(p => p.status === 'inactive').map(p => `${p.id}: ${p.product_name}`));

        db.close();
        res.json({ programmes: transformedProgrammes });

    } catch (error) {
        db.close();
        console.error('Error fetching spray programmes:', error);
        
        // Fallback to mock data if database fails
        const mockSprayProgrammes = [
            {
                id: 1,
                week: 1,
                date: '2024-01-08',
                product_name: 'CalMag + Iron Chelate',
                programme: 'Foliar Spray',
                products: 'CalMag + Iron Chelate',
                application_rate: '2ml/L',
                target_areas: 'All leafy greens',
                weather_conditions: 'Cloudy, no wind',
                applied: false,
                notes: '',
                category: 'foliar-feeds',
                active_ingredient: 'Calcium, Magnesium, Iron'
            },
            {
                id: 2,
                week: 2,
                date: '2024-01-15',
                product_name: 'Beneficial Bacteria + Enzymes',
                programme: 'Root Drench',
                products: 'Beneficial Bacteria + Enzymes',
                application_rate: '5ml/L',
                target_areas: 'Root zones - all beds',
                weather_conditions: 'Morning application preferred',
                applied: true,
                notes: 'Applied as scheduled',
                category: 'soil-drenches',
                active_ingredient: 'Beneficial microorganisms'
            },
            {
                id: 3,
                week: 3,
                date: '2024-01-22',
                product_name: 'Neem Oil + Soap Solution',
                programme: 'Pest Prevention',
                products: 'Neem Oil + Soap Solution',
                application_rate: '10ml/L + 2ml/L',
                target_areas: 'Leaves - focus on undersides',
                weather_conditions: 'Late afternoon, no direct sunlight',
                applied: false,
                notes: '',
                category: 'insecticides',
                active_ingredient: 'Azadirachtin'
            },
            {
                id: 4,
                week: 4,
                date: '2024-01-29',
                product_name: 'Bioneem',
                programme: 'Insecticide Application',
                products: 'Bioneem',
                application_rate: '100ml/10L',
                target_areas: 'All plant surfaces',
                weather_conditions: 'Optimal conditions',
                applied: false,
                notes: 'Preventative application',
                category: 'insecticides',
                active_ingredient: 'Azadirachtin'
            }
        ];

        res.json({ programmes: mockSprayProgrammes });
    }
});

// Create new spray programme
router.post('/', async (req, res) => {
    const { 
        system_id, 
        category, 
        product_name, 
        active_ingredient,
        target_pest,
        target_disease,
        nutrient_type,
        application_rate, 
        rate_unit,
        frequency_days,
        start_date,
        end_date,
        notes 
    } = req.body;

    if (!system_id || !category || !product_name) {
        return res.status(400).json({ 
            error: 'System ID, category, and product name are required' 
        });
    }

    const db = getDatabase();

    try {
        // Build target field based on category
        let target_field = '';
        if (category === 'insecticides' && target_pest) {
            target_field = target_pest;
        } else if (category === 'fungicides' && target_disease) {
            target_field = target_disease;
        } else if (category === 'foliar-feeds' && nutrient_type) {
            target_field = nutrient_type;
        }

        // Combine application rate and unit
        const full_application_rate = rate_unit ? `${application_rate} ${rate_unit}` : application_rate;

        // Build frequency text
        const frequency_text = frequency_days ? `Every ${frequency_days} days` : '';

        const result = await new Promise((resolve, reject) => {
            db.run(`
                INSERT INTO spray_programmes 
                (system_id, category, product_name, active_ingredient, target_pest, application_rate, frequency, start_date, end_date, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [system_id, category, product_name, active_ingredient, target_field, full_application_rate, frequency_text, start_date, end_date, notes], 
            function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
            });
        });

        db.close();
        res.json({ 
            success: true, 
            id: result.id, 
            message: 'Spray programme created successfully' 
        });

    } catch (error) {
        db.close();
        console.error('Error creating spray programme:', error);
        res.status(500).json({ error: 'Failed to create spray programme' });
    }
});

// Record spray programme application
router.post('/record', async (req, res) => {
    const { 
        programme_id, 
        products_used, 
        amount_used, 
        application_date, 
        dilution_rate,
        volume_applied,
        weather_conditions,
        effectiveness_rating,
        notes 
    } = req.body;
    const db = getDatabase();

    if (!programme_id || !application_date) {
        return res.status(400).json({ error: 'Programme ID and application date are required' });
    }

    try {
        const result = await new Promise((resolve, reject) => {
            db.run(`
                INSERT INTO spray_applications 
                (programme_id, application_date, dilution_rate, volume_applied, weather_conditions, effectiveness_rating, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [programme_id, application_date, dilution_rate, volume_applied, weather_conditions, effectiveness_rating, notes], 
            function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
            });
        });

        db.close();
        res.json({ 
            success: true, 
            application_id: result.id,
            message: 'Spray application recorded successfully',
            data: {
                programme_id,
                application_date,
                dilution_rate,
                volume_applied,
                weather_conditions,
                effectiveness_rating,
                notes,
                recorded_at: new Date().toISOString()
            }
        });

    } catch (error) {
        db.close();
        console.error('Error recording spray application:', error);
        res.status(500).json({ error: 'Failed to record spray application' });
    }
});

// Update spray programme
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        product_name, 
        active_ingredient,
        target_pest,
        application_rate, 
        frequency,
        start_date,
        end_date,
        notes 
    } = req.body;
    const db = getDatabase();

    if (!id) {
        return res.status(400).json({ error: 'Programme ID is required' });
    }

    try {
        await new Promise((resolve, reject) => {
            db.run(`
                UPDATE spray_programmes 
                SET product_name = ?, active_ingredient = ?, target_pest = ?, 
                    application_rate = ?, frequency = ?, start_date = ?, 
                    end_date = ?, notes = ?
                WHERE id = ?
            `, [product_name, active_ingredient, target_pest, application_rate, frequency, start_date, end_date, notes, id], 
            function(err) {
                if (err) reject(err);
                else resolve();
            });
        });

        db.close();
        res.json({ 
            success: true, 
            message: 'Spray programme updated successfully',
            data: {
                id,
                product_name,
                active_ingredient,
                target_pest,
                application_rate,
                frequency,
                start_date,
                end_date,
                notes,
                updated_at: new Date().toISOString()
            }
        });

    } catch (error) {
        db.close();
        console.error('Error updating spray programme:', error);
        res.status(500).json({ error: 'Failed to update spray programme' });
    }
});

// Delete spray programme
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const db = getDatabase();

    if (!id) {
        return res.status(400).json({ error: 'Programme ID is required' });
    }

    try {
        // Mark programme as inactive instead of deleting it (preserves history)
        await new Promise((resolve, reject) => {
            db.run('UPDATE spray_programmes SET status = ?, end_date = ? WHERE id = ?', 
                ['inactive', new Date().toISOString().split('T')[0], id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Keep spray_applications intact - this preserves the history
        // Only the programme is marked as inactive, stopping future applications

        db.close();
        res.json({ 
            success: true, 
            message: 'Spray programme removed from schedule (history preserved)'
        });

    } catch (error) {
        db.close();
        console.error('Error deleting spray programme:', error);
        res.status(500).json({ error: 'Failed to delete spray programme' });
    }
});

// Get spray programme calendar/schedule
router.get('/calendar', (req, res) => {
    const { system_id, month, year } = req.query;
    const db = getDatabase();

    if (!system_id) {
        return res.status(400).json({ error: 'System ID is required' });
    }

    // Return mock calendar data
    const mockCalendar = {
        month: month || new Date().getMonth() + 1,
        year: year || new Date().getFullYear(),
        schedules: [
            {
                date: '2024-01-08',
                type: 'foliar',
                programme: 'Foliar Spray - CalMag + Iron',
                status: 'scheduled'
            },
            {
                date: '2024-01-15',
                type: 'root',
                programme: 'Root Drench - Beneficial Bacteria',
                status: 'completed'
            },
            {
                date: '2024-01-22',
                type: 'pest',
                programme: 'Pest Prevention - Neem Oil',
                status: 'scheduled'
            },
            {
                date: '2024-01-29',
                type: 'nutrient',
                programme: 'Nutrient Boost - Kelp + Fish',
                status: 'scheduled'
            }
        ]
    };

    res.json(mockCalendar);
});

// Get application history for a spray programme
router.get('/:id/history', async (req, res) => {
    const { id } = req.params;
    const db = getDatabase();

    if (!id) {
        return res.status(400).json({ error: 'Programme ID is required' });
    }

    try {
        const history = await new Promise((resolve, reject) => {
            db.all(`
                SELECT sa.*, sp.product_name, sp.category
                FROM spray_applications sa
                JOIN spray_programmes sp ON sa.programme_id = sp.id
                WHERE sp.id = ?
                ORDER BY sa.application_date DESC
            `, [id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        db.close();
        res.json({ 
            programme_id: id,
            applications: history 
        });

    } catch (error) {
        db.close();
        console.error('Error fetching spray programme history:', error);
        res.status(500).json({ error: 'Failed to fetch spray programme history' });
    }
});

// Create default spray programmes for a new system
router.post('/create-defaults', async (req, res) => {
    const { system_id, force } = req.body;
    const db = getDatabase();

    if (!system_id) {
        return res.status(400).json({ error: 'System ID is required' });
    }

    try {
        // Check if system already has spray programmes
        const existingProgrammes = await new Promise((resolve, reject) => {
            db.all('SELECT COUNT(*) as count FROM spray_programmes WHERE system_id = ?', [system_id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows[0].count);
            });
        });

        if (existingProgrammes > 0 && !force) {
            db.close();
            return res.json({ message: 'System already has spray programmes', created: 0 });
        }

        // If force flag is set, delete existing programmes first
        if (force && existingProgrammes > 0) {
            await new Promise((resolve, reject) => {
                db.run('DELETE FROM spray_programmes WHERE system_id = ?', [system_id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            console.log('Deleted existing programmes for system:', system_id);
        }

        // Default spray programme data (based on BCF Spray Plan)
        const defaultProgrammes = [
            // Insecticides
            {
                category: 'insecticides',
                product_name: 'Bioneem',
                active_ingredient: 'Azadirachtin',
                target_pest: 'Bollworm, Snout Beetle, Aphids, Two-Spotted Mite, European Red Mite, Codling Moth, Fruit Fly',
                application_rate: '100 ml per 10L',
                frequency: 'Every 7 days',
                notes: 'Preventative Foliar - Combine with Foliar feeds'
            },
            {
                category: 'insecticides',
                product_name: 'Pyrol',
                active_ingredient: 'Pyrethrin',
                target_pest: 'Bollworm, Snout Beetle, Aphids, Two-Spotted Mite, European Red Mite, Codling Moth, Fruit Fly',
                application_rate: '100 ml per 10L',
                frequency: 'Every 7 days',
                notes: 'Reactive Foliar - Combine with Foliar feeds'
            },
            {
                category: 'insecticides',
                product_name: 'Metarhizium 62',
                active_ingredient: 'Metarhizium anisopliae',
                target_pest: 'Thrips, Whitefly, Snout Beetle',
                application_rate: '5 ml per 10L',
                frequency: 'Every 10 days',
                notes: 'Always Foliar - Combine with Foliar feeds'
            },
            {
                category: 'insecticides',
                product_name: 'Eco Insect Control',
                active_ingredient: 'Spinosad',
                target_pest: 'Thrips, Bollworm, Lawn Caterpillar',
                application_rate: '7 ml per 10L',
                frequency: 'Every 7 days',
                notes: 'Reactive Foliar - Combine with Foliar feeds'
            },
            // Fungicides
            {
                category: 'fungicides',
                product_name: 'Copper Soap',
                active_ingredient: 'Copper Octanoate',
                target_pest: 'Downy Mildew, Powdery Mildew',
                application_rate: '150 ml per 10L',
                frequency: 'Every 7 days',
                notes: 'Preventative Foliar - Combine with Foliar feeds'
            },
            {
                category: 'fungicides',
                product_name: 'Bacillus',
                active_ingredient: 'Bacillus Subtilis',
                target_pest: 'Downy Mildew, Powdery Mildew',
                application_rate: '10 ml per 10L',
                frequency: 'Every 10 days',
                notes: 'Preventative Foliar - Combine with ORGANIC Foliar feeds'
            },
            {
                category: 'fungicides',
                product_name: 'AmyloX',
                active_ingredient: 'Bacillus Amyloliquefaciens',
                target_pest: 'Downy Mildew, Powdery Mildew',
                application_rate: '20 g per 10L',
                frequency: 'Every 10 days',
                notes: 'Reactive - Combine with ORGANIC Foliar feeds'
            },
            {
                category: 'fungicides',
                product_name: 'Lime Sulphur',
                active_ingredient: 'Polysulphide Sulphur',
                target_pest: 'Downy Mildew, Powdery Mildew',
                application_rate: '250 ml per 10L',
                frequency: 'Every 14 days',
                notes: 'Reactive - Combine with ORGANIC Foliar feeds'
            },
            {
                category: 'fungicides',
                product_name: 'Full Cream Milk',
                active_ingredient: 'Milk Protein',
                target_pest: 'Powdery Mildew',
                application_rate: '1 part milk to 2-3 parts water',
                frequency: 'Every 7 days',
                notes: 'Reactive - Combine with ORGANIC Foliar feeds'
            },
            {
                category: 'fungicides',
                product_name: 'Trichoderma',
                active_ingredient: 'Trichoderma asperellum oil',
                target_pest: 'Pythium',
                application_rate: '30 ml per 10L',
                frequency: 'Every 14 days',
                notes: 'Reactive - Combine with ORGANIC Foliar feeds'
            },
            // Foliar Feeds
            {
                category: 'foliar-feeds',
                product_name: 'Nitrosol',
                active_ingredient: 'NPK, Magnesium, Calcium, Sulphur, Micronutrients, Growth hormone',
                target_pest: 'Complete nutrient solution',
                application_rate: '50 ml per 10L',
                frequency: 'Every 7 days',
                notes: 'Foliar Feed leaves - Complete nutrient solution'
            },
            {
                category: 'foliar-feeds',
                product_name: 'Eckosil',
                active_ingredient: 'Silicium, Iron EDTA, Molybdenum, Zinc',
                target_pest: 'Silicon and micronutrients',
                application_rate: '3 ml per 10L',
                frequency: 'Every 14 days',
                notes: 'Foliar Feed leaves - Silicon and micronutrients'
            },
            {
                category: 'foliar-feeds',
                product_name: 'Seabrix/Oceanfert/Seaboost/Seagrow',
                active_ingredient: 'N, P, K, Ca, Mg + Micronutrients',
                target_pest: 'Seaweed extract nutrition',
                application_rate: '30 ml per 10L',
                frequency: 'Every 7 days',
                notes: 'Foliar Feed leaves - Seaweed extract with complete nutrition'
            },
            {
                category: 'foliar-feeds',
                product_name: 'Fulvic Acid',
                active_ingredient: 'Fulvic Acid, Humic Acid',
                target_pest: 'Nutrient uptake enhancement',
                application_rate: '7.5 g per 10L',
                frequency: 'Every 14 days',
                notes: 'Foliar Feed leaves - Nutrient uptake enhancer'
            },
            {
                category: 'foliar-feeds',
                product_name: 'Iron Chelate',
                active_ingredient: 'Iron DPTA Chelate 11%',
                target_pest: 'Iron deficiency correction',
                application_rate: '25-50 g per 10L',
                frequency: 'Every 7 days',
                notes: 'Foliar Feed leaves - Iron deficiency correction'
            },
            {
                category: 'foliar-feeds',
                product_name: 'Potassium Nitrate',
                active_ingredient: '38.7% Potassium, 61.3% Nitrate',
                target_pest: 'Potassium and nitrogen boost',
                application_rate: '100 g/0.5% per 10L with Nitrosol/Seaweed extract',
                frequency: 'Every 7 days',
                notes: 'Foliar Feed leaves - Potassium and nitrogen boost'
            },
            {
                category: 'foliar-feeds',
                product_name: 'Calcium Nitrate',
                active_ingredient: '24.4% Calcium, 77.6% Nitrate',
                target_pest: 'Calcium deficiency prevention',
                application_rate: '100 g/0.5% per 10L with Nitrosol/Seaweed extract',
                frequency: 'Every 7 days',
                notes: 'Foliar Feed leaves - Calcium deficiency prevention'
            },
            {
                category: 'foliar-feeds',
                product_name: 'Magnesium Sulphate (Epsom Salt)',
                active_ingredient: '20.2% Magnesium, 79.8% Sulphate',
                target_pest: 'Magnesium supplementation',
                application_rate: '100 g/0.5% per 10L with Nitrosol/Seaweed extract',
                frequency: 'Every 10 days',
                notes: 'Foliar Feed leaves - Promotes green growth, spray on leafy plants'
            },
            {
                category: 'foliar-feeds',
                product_name: 'Calsure',
                active_ingredient: 'Calcium Chelate',
                target_pest: 'Calcium deficiency treatment',
                application_rate: '200 ml/1% per 10L with Fulvic acid',
                frequency: 'Every 7 days',
                notes: 'Use when Calcium Deficiency detected'
            },
            {
                category: 'foliar-feeds',
                product_name: 'Organofert',
                active_ingredient: 'Humic and Fulvic Acids, Earthworm extracts, Micro-Organisms and Fish Emulsion',
                target_pest: 'Organic nutrition',
                application_rate: '200 ml per 10L',
                frequency: 'Every 14 days',
                notes: 'Foliar Feed leaves - 10-14 day interval'
            },
            {
                category: 'foliar-feeds',
                product_name: 'Shiman 2-1-2',
                active_ingredient: 'Full spectrum of minerals',
                target_pest: 'Mineral supplementation',
                application_rate: '20 g per 10L',
                frequency: 'Every 14 days',
                notes: 'Do not use with Lime Sulphur, Bordeaux mixture or Copper containing products'
            }
        ];

        // Insert all default programmes
        let createdCount = 0;
        for (const programme of defaultProgrammes) {
            await new Promise((resolve, reject) => {
                db.run(`
                    INSERT INTO spray_programmes 
                    (system_id, category, product_name, active_ingredient, target_pest, application_rate, frequency, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [system_id, programme.category, programme.product_name, programme.active_ingredient, 
                    programme.target_pest, programme.application_rate, programme.frequency, programme.notes], 
                function(err) {
                    if (err) reject(err);
                    else {
                        createdCount++;
                        resolve();
                    }
                });
            });
        }

        db.close();
        res.json({ 
            success: true, 
            message: `${createdCount} default spray programmes created successfully`,
            created: createdCount
        });

    } catch (error) {
        db.close();
        console.error('Error creating default spray programmes:', error);
        res.status(500).json({ error: 'Failed to create default spray programmes' });
    }
});

module.exports = router;