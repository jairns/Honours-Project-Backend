const jwt = require('jsonwebtoken');
require('dotenv/config');

// When creating a middleware function, always include next as it indicates are completing the function, move onto the next middleware
module.exports = function(req, res, next) {
    // Get token from header
    const token = req.header('x-auth-token');
    // Check if a token does not exist
    if(!token) {
        // Return forbidden status and error message
        return res.status(401).json({ msg: 'Access Denied - You are unauthorised' });
    }

    try { 
        // Verifying the token along with its payload - userid
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Getting the verified user from the token's payload
        req.user = decoded.user;
        // Move onto next middleware
        next();
    } catch (err) {
        // Return forbidden status and error message
        return res.status(401).json({ msg: 'Access Denied - Token not valid' });
    }
}