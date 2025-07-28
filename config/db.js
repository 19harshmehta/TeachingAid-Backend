module.exports = {
    connect: async () => {
        const mongoose = require('mongoose');
        const dbURI = process.env.DB_URI;

        try {
            await mongoose.connect(dbURI);
            console.log('Database connected successfully');
        } catch (error) {
            console.error('Database connection failed:', error);
            process.exit(1);
        }
    }
};
