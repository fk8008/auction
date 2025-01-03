const express = require('express');
const cors = require('cors');
const axios = require('axios');
const csv = require('csv-parser'); // Use csv-parser to parse CSV files
const app = express();

app.use(express.json());
app.use(cors());

let players = [];

// Store auction end time on the server (initially set to 2 minutes from server start)
let auctionEndTime = Date.now() + 2 * 60 * 1000; // 2-minute timer
let auctionTimerPaused = false; // Track if the timer is paused
let auctionTimerInterval;

// Fetch and load players from GitHub CSV
async function fetchPlayersFromGitHub() {
    const githubCsvUrl = "https://raw.githubusercontent.com/fk8008/auction/refs/heads/main/players.csv"; // Replace with your raw GitHub URL
    try {
        const response = await axios.get(githubCsvUrl, { responseType: 'stream' });
        const newPlayers = [];

        response.data
            .pipe(csv())
            .on('data', (row) => {
                newPlayers.push({
                    id: parseInt(row.PlayerID),
                    name: row.PlayerName,
                    position: row.PlayerPosition,
                    club: row.PlayerClub,
                    highestBid: 0,
                    highestBidder: ''
                });
            })
            .on('end', () => {
                players = newPlayers; // Replace the existing players array
                console.log('Players successfully loaded from GitHub.');
            });
    } catch (error) {
        console.error('Error fetching or parsing players CSV:', error.message);
    }
}

// Endpoint to manually trigger GitHub fetch
app.get('/api/load-players-from-github', async (req, res) => {
    try {
        await fetchPlayersFromGitHub();
        res.json({ success: true, message: 'Players loaded successfully from GitHub.', players });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load players from GitHub.', error: error.message });
    }
});

// Endpoint to reset all bids
app.post('/api/reset-bids', (req, res) => {
    players.forEach(player => {
        player.highestBid = 0;
        player.highestBidder = '';
    });

    res.json({ success: true, message: 'All bids have been reset.' });
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

    res.json({ success: true });
});

// Endpoint to set the auction time limit (in minutes)
app.post('/api/set-auction-time', (req, res) => {
    const { minutes } = req.body;
    if (isNaN(minutes) || minutes < 1 || minutes > 120) {
        return res.status(400).json({ success: false, message: 'Please set a valid time limit between 1 and 120 minutes.' });
    }
    auctionEndTime = Date.now() + minutes * 60 * 1000; // Set auction end time to the specified duration
    if (!auctionTimerPaused) {
        clearInterval(auctionTimerInterval);
        startAuctionTimer(); // Restart the timer
    }
    res.json({ success: true, auctionEndTime });  // Send the updated auctionEndTime to the frontend
});

// Endpoint to restart the auction
app.post('/api/restart-auction', (req, res) => {
    auctionEndTime = Date.now() + 2 * 60 * 1000; // Reset to 2 minutes from now
    if (!auctionTimerPaused) {
        clearInterval(auctionTimerInterval);
        startAuctionTimer(); // Restart the timer
    }
    res.json({ success: true, auctionEndTime }); // Send the updated auctionEndTime to the frontend
});

// Endpoint to pause the auction timer
app.post('/api/pause-timer', (req, res) => {
    auctionTimerPaused = true;
    clearInterval(auctionTimerInterval); // Pause the timer
    res.json({ success: true, auctionEndTime }); // Send the updated auctionEndTime to the frontend
});

// Endpoint to resume the auction timer
app.post('/api/resume-timer', (req, res) => {
    if (auctionTimerPaused) {
        auctionTimerPaused = false;
        startAuctionTimer(); // Resume the timer
        res.json({ success: true, auctionEndTime }); // Send the updated auctionEndTime to the frontend
    } else {
        res.json({ success: false, message: 'Timer is already running.' });
    }
});

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
            // Additional logic for when the auction ends (e.g., notify clients)
        }
    }, 1000);
}

// Start the auction timer on server start
startAuctionTimer();

// Load players from GitHub on server start
fetchPlayersFromGitHub();

// Start the server
app.listen(3000, () => {
    console.log('Auction server running on http://localhost:3000');
});
