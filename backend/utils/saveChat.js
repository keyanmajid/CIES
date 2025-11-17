import fs from "fs";
import path from "path";

const chatFilePath = path.join(process.cwd(), "chatLogs.json");

export const saveChatMessage = (messageData) => {
  try {
    let chats = [];

    // Read existing file if it exists
    if (fs.existsSync(chatFilePath)) {
      const fileData = fs.readFileSync(chatFilePath, "utf8");
      chats = fileData ? JSON.parse(fileData) : [];
    }

    // Append new message
    chats.push({
      timestamp: new Date().toISOString(),
      ...messageData,
    });

    // Save back to file
    fs.writeFileSync(chatFilePath, JSON.stringify(chats, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving chat message:", err);
  }
};
