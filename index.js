const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

let players = [
    { id: 1, name: 'Player 1', highestBid: 0, highestBidder: '' },
    { id: 2, name: 'Player 2', highestBid: 0, highestBidder: '' },
    { id: 3, name: 'Player 3', highestBid: 0, highestBidder: '' }
];

// Store auction end time on the server (e.g., 2 minutes from server start)
let auctionEndTime = Date.now() + 2 * 60 * 1000; // 2-minute timer

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

// Start the server
app.listen(3000, () => {
    console.log('Auction server running on http://localhost:3000');
});
