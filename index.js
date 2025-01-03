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

let players = [
    { id: 1, name: 'Player 1', highestBid: 0, highestBidder: '' },
    { id: 2, name: 'Player 2', highestBid: 0, highestBidder: '' },
    { id: 3, name: 'Player 3', highestBid: 0, highestBidder: '' }
];
let bidLogs = []; // To store bid logs

// Auction timing and state
let auctionEndTime = Date.now() + 2 * 60 * 1000; // 2-minute timer
let auctionTimerPaused = false; // Track if the timer is paused
let auctionTimerInterval;

// Function to load players from a CSV file
function loadPlayersFromCSV(filePath) {
    const data = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', row => {
                data.push({
                    id: parseInt(row.PlayerID),
                    name: row.PlayerName,
                    position: row.PlayerPosition,
                    club: row.PlayerClub,
                    highestBid: 0,
                    highestBidder: ''
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
function logBid(playerId, playerName, bidderName, bidAmount) {
    bidLogs.push({
        playerId,
        playerName,
        bidderName,
        bidAmount,
        timestamp: new Date().toISOString()
    });
}

// Endpoint to reset all bids
app.post('/api/reset-bids', (req, res) => {
    players.forEach(player => {
        player.highestBid = 0;
        player.highestBidder = '';
    });

    res.json({ success: true, message: 'All bids have been reset.' });
});

// Endpoint to upload and initialize players from a CSV file
app.post('/api/upload-players', upload.single('file'), async (req, res) => {
    try {
        const filePath = req.file.path;
        players = await loadPlayersFromCSV(filePath);
        fs.unlinkSync(filePath); // Delete the uploaded file
        res.json({ success: true, message: 'Players loaded successfully.', players });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load players.', error: error.message });
    }
});

// Endpoint to get the auction end time
app.get('/api/auction-end-time', (req, res) => {
    res.json({ auctionEndTime });
});

// Endpoint to get players
app.get('/api/players', (req, res) => {
    res.json(players);
});

// Endpoint to submit a bid
app.post('/api/bid', (req, res) => {
    if (Date.now() > auctionEndTime) {
        return res.json({ success: false, message: 'Auction has ended.' });
    }

    const { playerId, bidderName, bidAmount } = req.body;
    const player = players.find(p => p.id === parseInt(playerId));

    if (!player) {
        return res.json({ success: false, message: 'Player not found.' });
    }

    if (bidAmount <= player.highestBid) {
        return res.json({ success: false, message: 'Bid must be higher than the current highest bid.' });
    }

    player.highestBid = bidAmount;
    player.highestBidder = bidderName;

    // Log the bid
    logBid(player.id, player.name, bidderName, bidAmount);

    res.json({ success: true });
});

// Endpoint to set the auction time limit
app.post('/api/set-auction-time', (req, res) => {
    const { minutes } = req.body;
    if (isNaN(minutes) || minutes < 1 || minutes > 120) {
        return res.status(400).json({ success: false, message: 'Please set a valid time limit between 1 and 120 minutes.' });
    }
    auctionEndTime = Date.now() + minutes * 60 * 1000;
    if (!auctionTimerPaused) {
        clearInterval(auctionTimerInterval);
        startAuctionTimer();
    }
    res.json({ success: true, auctionEndTime });
});

// Endpoint to export all bid logs as CSV
app.get('/api/export-bids', (req, res) => {
    const header = 'Player ID,Player Name,Bidder Name,Bid Amount,Timestamp\n';
    const rows = bidLogs.map(log =>
        `${log.playerId},${log.playerName},${log.bidderName},${log.bidAmount},${log.timestamp}`
    ).join('\n');

    const csv = header + rows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=bids.csv');
    res.send(csv);
});

// Other auction timer-related endpoints remain unchanged...

// Function to start auction timer
function startAuctionTimer() {
    auctionTimerInterval = setInterval(() => {
        const now = Date.now();
        const timeLeft = Math.max(0, auctionEndTime - now);
        const minutes = Math.floor(timeLeft / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        console.log(`Time left: ${minutes}:${seconds.toString().padStart(2, '0')}`);

        if (timeLeft === 0) {
            clearInterval(auctionTimerInterval);
            console.log('Auction has ended!');
            // Additional logic for when the auction ends
        }
    }, 1000);
}

// Start the auction timer on server start
startAuctionTimer();

// Start the server
app.listen(3000, () => {
    console.log('Auction server running on http://localhost:3000');
});
