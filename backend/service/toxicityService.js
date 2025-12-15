// backend/service/toxicityService.js
import axios from 'axios';
import Interaction from '../models/Interaction.js';
import User from '../models/User.js';

class ToxicityService {
  constructor() {
    this.mlApiUrl = 'https://keyanmajid-toxicityml.hf.space';
  }

  // 🔥 MAIN FUNCTION: Analyze a single chat for toxicity
  async analyzeInteraction(interactionId) {
    try {
      console.log(`🔍 Analyzing interaction ${interactionId} for toxicity...`);
      
      // Get the interaction
      const interaction = await Interaction.findById(interactionId);
      if (!interaction) {
        throw new Error('Interaction not found');
      }

      // Get employee BEFORE analysis
      const employeeBefore = await User.findById(interaction.employeeId);
      const initialScore = employeeBefore?.score || 100;
      
      console.log(`👤 Employee ${interaction.employeeId}: Initial score = ${initialScore}`);

      // Format messages for ML API
      const formattedMessages = interaction.messages.map(msg => ({
        text: msg.text,
        sender_id: msg.sender, // "employee" or "customer"
        timestamp: msg.timestamp || new Date().toISOString()
      }));

      // Prepare data for ML API
      const chatData = {
        chat_id: interactionId.toString(),
        messages: formattedMessages,
        participants: ["customer", "employee"]
      };

      // Call ML API
      console.log(`📡 Sending to ML API: ${formattedMessages.length} messages`);
      const response = await axios.post(
        `${this.mlApiUrl}/analyze-chat`,
        chatData,
        { timeout: 30000 }
      );

      const mlResult = response.data;
      console.log(`✅ ML API Response:`, {
        toxic_messages: mlResult.toxic_messages,
        employee_toxic_messages: mlResult.employee_toxic_messages,
        points_deducted: mlResult.points_deducted
      });

      // Get points to deduct
      const pointsToDeduct = Math.max(0, Number(mlResult.points_deducted) || 0);
      
      if (pointsToDeduct > 0) {
        console.log(`💰 Deducting ${pointsToDeduct} points from employee ${interaction.employeeId}`);
        
        // Update employee score
        const newScore = Math.max(0, initialScore - pointsToDeduct);
        await User.findByIdAndUpdate(
          interaction.employeeId,
          { score: newScore },
          { new: true }
        );
        
        console.log(`📉 Score updated: ${initialScore} → ${newScore}`);
      }

      // Save analysis results
      await Interaction.findByIdAndUpdate(interactionId, {
        mlAnalysis: {
          analyzedAt: new Date(),
          toxicMessages: mlResult.toxic_messages || 0,
          employeeToxicMessages: mlResult.employee_toxic_messages || 0,
          toxicityPercentage: mlResult.toxicity_percentage || 0,
          pointsDeducted: pointsToDeduct,
          rawResult: mlResult
        },
        analyzedForToxicity: true
      });

      // Get employee AFTER analysis
      const employeeAfter = await User.findById(interaction.employeeId);
      
      return {
        success: true,
        interactionId,
        employeeId: interaction.employeeId,
        pointsDeducted: pointsToDeduct,
        analysis: mlResult,
        scoreUpdate: {
          before: initialScore,
          after: employeeAfter?.score || initialScore,
          changed: initialScore !== employeeAfter?.score
        }
      };

    } catch (error) {
      console.error(`❌ Toxicity analysis failed: ${error.message}`);
      
      // Save error state
      await Interaction.findByIdAndUpdate(interactionId, {
        mlAnalysis: {
          analyzedAt: new Date(),
          error: error.message,
          status: 'failed'
        }
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new ToxicityService();