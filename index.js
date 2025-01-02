// ==========================
// BACKEND: Node.js + Express
// ==========================
const express = require('express');
const app = express();
app.use(express.json());

let players = [
    { id: 1, name: 'Player 1', highestBid: 0, highestBidder: '' },
    { id: 2, name: 'Player 2', highestBid: 0, highestBidder: '' },
    { id: 3, name: 'Player 3', highestBid: 0, highestBidder: '' }
];

let auctionEndTime = Date.now() + 30 * 60 * 1000;

// Get players
app.get('/api/players', (req, res) => {
    res.json(players);
});

// Submit bid
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

// Start server
app.listen(3000, () => {
    console.log('Auction server running on http://localhost:3000');
});
