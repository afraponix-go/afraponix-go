// Tables that hold system data but don't have an ON DELETE CASCADE foreign key
// to systems, so they must be cleared explicitly before the system row is
// dropped (dropping the row cascades everything that IS keyed to it).
const UNCASCADED_SYSTEM_TABLES = [
    'fish_events',
    'fish_harvest',
    'fish_inventory',
    'nutrient_readings',
    'nutrient_deficiency_images',
    'import_history',
];

// Delete a single system and all of its data on the given (transaction)
// connection. Caller owns the transaction (begin/commit/rollback).
async function deleteSystemData(connection, systemId) {
    for (const table of UNCASCADED_SYSTEM_TABLES) {
        await connection.execute(`DELETE FROM ${table} WHERE system_id = ?`, [systemId]);
    }
    await connection.execute('DELETE FROM systems WHERE id = ?', [systemId]);
}

module.exports = { UNCASCADED_SYSTEM_TABLES, deleteSystemData };
