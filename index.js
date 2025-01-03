const express = require('express');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const csvParser = require('csv-parser');

const app = express();

app.use(express.json());
app.use(cors());

// Use multer to handle file uploads
const upload = multer({ dest: 'uploads/' });

let players = []; // To store player data
let bidLogs = []; // To store bid logs

// Function to load players from a CSV file
function loadPlayersFromCSV(filePath) {
    const data = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', row => {
                data.push({
                    playerId: parseInt(row.PlayerID),
                    playerName: row.PlayerName,
                    playerPosition: row.PlayerPosition,
                    playerClub: row.PlayerClub,
                    bidderName: '',
                    bidAmount: 0,
                    timestamp: null
                });
            })
            .on('end', () => {
                resolve(data);
            })
            .on('error', error => {
                reject(error);
            });
    });
}

// Log a bid
function logBid(playerId, playerName, playerPosition, playerClub, bidderName, bidAmount) {
    bidLogs.push({
        playerId,
        playerName,
        playerPosition,
        playerClub,
        bidderName,
        bidAmount,
        timestamp: new Date().toISOString()
    });
}

// Endpoint to upload and load the CSV file
app.post('/api/upload-players', upload.single('file'), async (req, res) => {
    try {
        const filePath = req.file.path;
        players = await loadPlayersFromCSV(filePath);
        fs.unlinkSync(filePath); // Remove the uploaded file after processing
        res.json({ success: true, message: 'Players loaded successfully.', players });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load players.', error: error.message });
    }
});

// Endpoint to fetch all players
app.get('/api/players', (req, res) => {
    res.json(players);
});

// Endpoint to place a bid
app.post('/api/bid', (req, res) => {
    const { playerId, bidderName, bidAmount } = req.body;

    const player = players.find(p => p.playerId === parseInt(playerId));
    if (!player) {
        return res.status(404).json({ success: false, message: 'Player not found.' });
    }

    if (bidAmount <= player.bidAmount) {
        return res.status(400).json({ success: false, message: 'Bid must be higher than the current bid.' });
    }

    // Update player details
    player.bidderName = bidderName;
    player.bidAmount = bidAmount;
    player.timestamp = new Date().toISOString();

    // Log the bid
    logBid(player.playerId, player.playerName, player.playerPosition, player.playerClub, bidderName, bidAmount);

    res.json({ success: true, player });
});

// Endpoint to export all bids as CSV
app.get('/api/export-bids', (req, res) => {
    const header = 'Player ID,Player Name,Player Position,Player Club,Bidder Name,Bid Amount,Timestamp\n';
    const rows = bidLogs.map(log =>
        `${log.playerId},${log.playerName},${log.playerPosition},${log.playerClub},${log.bidderName},${log.bidAmount},${log.timestamp}`
    ).join('\n');

    const csv = header + rows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=bids.csv');
    res.send(csv);
});

// Start the server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
