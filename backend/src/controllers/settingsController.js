import { Settings } from '../models/Settings.js';

export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ userId: req.userId });
    if (!settings) {
      settings = await Settings.create({
        userId: req.userId,
        openingBalance: 0,
        currency: 'INR',
        companyName: 'TechMines',
      });
    }
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve settings', error: error.message });
  }
};

export const updateOpeningBalance = async (req, res) => {
  try {
    const { openingBalance, openingBalanceNotes, openingBalanceDate } = req.body;

    const parsedBalance = parseFloat(openingBalance);
    if (isNaN(parsedBalance)) {
      return res.status(400).json({ success: false, message: 'Opening balance must be a valid number' });
    }

    let settings = await Settings.findOne({ userId: req.userId });
    if (!settings) {
      settings = new Settings({ userId: req.userId });
    }

    settings.openingBalance = Math.round(parsedBalance * 100) / 100;
    if (openingBalanceNotes !== undefined) {
      settings.openingBalanceNotes = openingBalanceNotes.trim();
    }
    if (openingBalanceDate) {
      const d = new Date(openingBalanceDate);
      if (!isNaN(d.getTime())) settings.openingBalanceDate = d;
    }

    await settings.save();

    res.json({
      success: true,
      message: 'Opening balance updated successfully',
      settings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update opening balance', error: error.message });
  }
};
