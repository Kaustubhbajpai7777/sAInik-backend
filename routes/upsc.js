const express = require('express');
const router = express.Router();
const UPSCScraper = require('../services/upscScraper');

// Initialize the scraper
const upscScraper = new UPSCScraper();

// Get latest UPSC notifications
router.get('/notifications', async (req, res) => {
    try {
        console.log('Fetching UPSC notifications...');
        const notifications = await upscScraper.scrapeLatestNotifications();
        
        res.json({
            success: true,
            count: notifications.length,
            data: notifications,
            lastUpdated: new Date().toISOString(),
            cacheStatus: upscScraper.getCacheStatus()
        });
    } catch (error) {
        console.error('UPSC notifications API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch UPSC notifications',
            message: error.message
        });
    }
});

// Search specific UPSC notifications
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        console.log(`Searching UPSC notifications for: ${query}`);
        
        const results = await upscScraper.searchSpecificNotification(query);
        
        res.json({
            success: true,
            query: query,
            count: results.length,
            data: results
        });
    } catch (error) {
        console.error('UPSC search API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search UPSC notifications',
            message: error.message
        });
    }
});

// Refresh cache (useful for admin or manual refresh)
router.post('/refresh', async (req, res) => {
    try {
        console.log('Refreshing UPSC notifications cache...');
        upscScraper.clearCache();
        const notifications = await upscScraper.scrapeLatestNotifications();
        
        res.json({
            success: true,
            message: 'Cache refreshed successfully',
            count: notifications.length,
            data: notifications
        });
    } catch (error) {
        console.error('UPSC refresh API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to refresh UPSC cache',
            message: error.message
        });
    }
});

// Get cache status
router.get('/cache-status', (req, res) => {
    try {
        const status = upscScraper.getCacheStatus();
        res.json({
            success: true,
            cache: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get cache status'
        });
    }
});

// Get AI insights for NDA preparation based on current notifications
router.get('/ai-insights', async (req, res) => {
    try {
        console.log('Generating AI insights for NDA preparation...');
        const notifications = await upscScraper.scrapeLatestNotifications();
        
        // Get titles of top 10 notifications
        const recentTitles = notifications
            .slice(0, 10)
            .map(n => n.title)
            .join('\n');
        
        const aiInsight = await upscScraper.generateAISummary(recentTitles);
        
        res.json({
            success: true,
            insight: aiInsight,
            basedOnNotifications: notifications.length,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('AI insights API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate AI insights',
            message: error.message,
            fallbackInsight: 'Stay updated with UPSC notifications. Regular practice and staying informed about exam dates, syllabus updates, and results are key to NDA success.'
        });
    }
});

// Get UPSC Calendar specific data with AI analysis
router.get('/calendar', async (req, res) => {
    try {
        console.log('Fetching UPSC calendar data with AI analysis...');
        const calendarData = await upscScraper.getCalendarSpecificData();
        
        res.json({
            success: true,
            data: calendarData,
            message: 'Calendar data retrieved successfully'
        });
    } catch (error) {
        console.error('Calendar API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch calendar data',
            message: error.message
        });
    }
});

// Get NDA/NA specific notifications and analysis
router.get('/nda-notifications', async (req, res) => {
    try {
        console.log('Fetching NDA/NA specific notifications...');
        const ndaData = await upscScraper.getNDASpecificData();
        
        res.json({
            success: true,
            data: ndaData,
            message: 'NDA/NA data retrieved successfully'
        });
    } catch (error) {
        console.error('NDA notifications API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch NDA notifications',
            message: error.message
        });
    }
});

// Get categorized notifications (Calendar, NDA/NA, General)
router.get('/categorized', async (req, res) => {
    try {
        console.log('Fetching categorized UPSC notifications...');
        const notifications = await upscScraper.scrapeLatestNotifications();
        
        const categorized = {
            calendar: notifications.filter(n => n.category === 'Calendar'),
            nda: notifications.filter(n => n.category === 'NDA/NA'),
            general: notifications.filter(n => n.category === 'General'),
            all: notifications
        };
        
        res.json({
            success: true,
            data: categorized,
            counts: {
                calendar: categorized.calendar.length,
                nda: categorized.nda.length,
                general: categorized.general.length,
                total: categorized.all.length
            },
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Categorized notifications API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch categorized notifications',
            message: error.message
        });
    }
});

// Proxy endpoint for downloading files (to handle CORS and provide analytics)
router.get('/download/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const notifications = await upscScraper.scrapeLatestNotifications();
        const notification = notifications.find(n => n.id === id);
        
        if (!notification) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }

        // For PDF files, we can redirect or proxy
        if (notification.type === 'PDF') {
            res.json({
                success: true,
                downloadUrl: notification.url,
                title: notification.title,
                message: 'You can download this file directly from the UPSC website'
            });
        } else {
            res.json({
                success: true,
                redirectUrl: notification.url,
                title: notification.title,
                message: 'Redirecting to the official UPSC page'
            });
        }
    } catch (error) {
        console.error('Download API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process download request'
        });
    }
});

module.exports = router;