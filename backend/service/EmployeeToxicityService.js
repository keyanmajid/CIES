// backend/service/EmployeeToxicityService.js

import axios from 'axios';

class EmployeeToxicityService {
    constructor() {
        this.mlApiUrl = process.env.TOXICITY_API_URL || 'https://keyanmajid-toxicitymlemp.hf.space';
        this.io = null;
        console.log('🔧 EmployeeToxicityService initialized');
    }

    // Set the Socket.io instance
    setIoInstance(ioInstance) {
        this.io = ioInstance;
        console.log('✅ Socket.IO instance set in toxicity service');
    }

    /**
     * Trigger ML service to analyze interaction
     */
    async triggerMLAnalysis(interactionId) {
        try {
            console.log(`🚀 Triggering ML analysis for interaction: ${interactionId}`);
            
            // Call ML service endpoint
            const response = await axios.get(`${this.mlApiUrl}/analyze-interaction/${interactionId}`, {
                timeout: 30000 // 30 second timeout
            });
            
            console.log(`✅ ML analysis triggered:`, response.data);
            
            // Send real-time update if socket is available
            if (this.io && response.data.analysis_result) {
                const analysis = response.data.analysis_result;
                this.sendRealTimeUpdate(interactionId, analysis);
            }
            
            return response.data;
            
        } catch (error) {
            console.error('❌ Error triggering ML analysis:', error.message);
            if (error.response) {
                console.error('   API Error:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Send real-time updates to dashboard
     */
    sendRealTimeUpdate(interactionId, analysis) {
        if (!this.io) {
            console.warn('⚠️ Cannot send real-time update: Socket.IO not available');
            return;
        }
        
        const updateData = {
            type: 'TOXICITY_ANALYSIS_COMPLETE',
            interactionId: interactionId,
            toxicityScore: analysis.overall_toxicity,
            pointsDeducted: analysis.recommended_points_deduction,
            severity: analysis.severity,
            timestamp: new Date()
        };

        // Emit to all connected clients
        this.io.emit('toxicityUpdate', updateData);
        
        console.log(`📢 Sent real-time update for interaction ${interactionId}`);
    }

    /**
     * Process completed interaction - MAIN ENTRY POINT
     */
    async processCompletedInteraction(interactionId) {
        try {
            console.log(`\n🎯 Processing toxicity for completed interaction: ${interactionId}`);
            
            // Trigger ML service analysis
            const result = await this.triggerMLAnalysis(interactionId);
            
            if (!result) {
                console.log(`❌ Failed to process interaction: ${interactionId}`);
                return null;
            }
            
            console.log(`✅ Toxicity processing complete for interaction: ${interactionId}`);
            
            return {
                interactionId,
                mlServiceResult: result,
                success: true
            };
            
        } catch (error) {
            console.error('❌ Error processing completed interaction:', error);
            return null;
        }
    }

    /**
     * Check ML service status
     */
    async checkSystemStatus() {
        try {
            // Test ML API connection
            const apiTest = await axios.get(`${this.mlApiUrl}/`, { timeout: 5000 })
                .then(res => ({ connected: true, status: res.data }))
                .catch(err => ({ connected: false, error: err.message }));

            return {
                mlApiUrl: this.mlApiUrl,
                mlApiConnected: apiTest.connected,
                ioAvailable: !!this.io,
                service: 'EmployeeToxicityService',
                status: 'active',
                timestamp: new Date()
            };
        } catch (error) {
            return {
                mlApiUrl: this.mlApiUrl,
                mlApiConnected: false,
                ioAvailable: !!this.io,
                service: 'EmployeeToxicityService',
                status: 'error',
                error: error.message,
                timestamp: new Date()
            };
        }
    }
}

// ✅ Create and export a singleton instance
const toxicityServiceInstance = new EmployeeToxicityService();
export default toxicityServiceInstance;