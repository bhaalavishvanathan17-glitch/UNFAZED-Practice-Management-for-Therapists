const ClinicalNote = require('../models/ClinicalNote');
const Client = require('../models/Client');
const Session = require('../models/Session');

/**
 * @desc    Create a new clinical session note (SOAP, DAP, or Freeform)
 * @route   POST /api/notes
 * @access  Private (Therapist)
 */
const createNote = async (req, res) => {
  try {
    const therapistId = req.therapist._id;
    const {
      clientId,
      sessionId,
      noteType = 'soap',
      title,
      visibility = 'private',
      contentHtml = '',
      contentJson = null,
      soap = {},
      dap = {},
      sessionDate,
    } = req.body;

    if (!clientId) {
      return res.status(400).json({
        status: 'error',
        message: 'Client ID is required.',
      });
    }

    // Strict multi-tenant verification: Ensure client belongs to authenticated therapist
    const client = await Client.findOne({ _id: clientId, therapistId });
    if (!client) {
      return res.status(404).json({
        status: 'error',
        message: 'Client record not found or access denied.',
      });
    }

    // If session ID provided, verify it belongs to this therapist
    if (sessionId) {
      const session = await Session.findOne({ _id: sessionId, therapistId });
      if (!session) {
        return res.status(404).json({
          status: 'error',
          message: 'Referenced session not found.',
        });
      }
    }

    const note = await ClinicalNote.create({
      therapistId,
      clientId,
      sessionId: sessionId || null,
      noteType,
      title: title?.trim() || `${noteType.toUpperCase()} Progress Note`,
      visibility: visibility === 'shared' ? 'shared' : 'private',
      contentHtml,
      contentJson,
      soap,
      dap,
      sessionDate: sessionDate ? new Date(sessionDate) : new Date(),
      sharedAt: visibility === 'shared' ? new Date() : null,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Clinical note saved successfully.',
      data: { note },
    });
  } catch (error) {
    console.error('Error creating clinical note:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to save clinical note.',
    });
  }
};

/**
 * @desc    Get all clinical notes for a specific client
 * @route   GET /api/notes/client/:clientId
 * @access  Private (Therapist)
 */
const getNotesByClient = async (req, res) => {
  try {
    const therapistId = req.therapist._id;
    const { clientId } = req.params;

    // Strict multi-tenant ownership check
    const client = await Client.findOne({ _id: clientId, therapistId });
    if (!client) {
      return res.status(404).json({
        status: 'error',
        message: 'Client record not found or access denied.',
      });
    }

    const notes = await ClinicalNote.find({ therapistId, clientId }).sort({ sessionDate: -1, createdAt: -1 });

    return res.status(200).json({
      status: 'success',
      data: {
        notes,
        total: notes.length,
      },
    });
  } catch (error) {
    console.error('Error fetching clinical notes:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve clinical notes.',
    });
  }
};

/**
 * @desc    Get single note by ID
 * @route   GET /api/notes/:id
 * @access  Private (Therapist)
 */
const getNoteById = async (req, res) => {
  try {
    const therapistId = req.therapist._id;
    const { id } = req.params;

    // Strict multi-tenant verification
    const note = await ClinicalNote.findOne({ _id: id, therapistId });
    if (!note) {
      return res.status(404).json({
        status: 'error',
        message: 'Clinical note not found or access denied.',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { note },
    });
  } catch (error) {
    console.error('Error fetching clinical note:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve clinical note.',
    });
  }
};

/**
 * @desc    Update clinical note
 * @route   PUT /api/notes/:id
 * @access  Private (Therapist)
 */
const updateNote = async (req, res) => {
  try {
    const therapistId = req.therapist._id;
    const { id } = req.params;
    const {
      title,
      visibility,
      contentHtml,
      contentJson,
      soap,
      dap,
      noteType,
      isLocked,
    } = req.body;

    const note = await ClinicalNote.findOne({ _id: id, therapistId });
    if (!note) {
      return res.status(404).json({
        status: 'error',
        message: 'Clinical note not found or access denied.',
      });
    }

    if (note.isLocked && isLocked === undefined) {
      return res.status(403).json({
        status: 'error',
        message: 'This note is locked and signed. Unlock before making changes.',
      });
    }

    if (title) note.title = title.trim();
    if (noteType) note.noteType = noteType;
    if (contentHtml !== undefined) note.contentHtml = contentHtml;
    if (contentJson !== undefined) note.contentJson = contentJson;
    if (soap !== undefined) note.soap = soap;
    if (dap !== undefined) note.dap = dap;
    if (isLocked !== undefined) note.isLocked = isLocked;

    if (visibility) {
      if (visibility === 'shared' && note.visibility !== 'shared') {
        note.sharedAt = new Date();
      }
      note.visibility = visibility;
    }

    await note.save();

    return res.status(200).json({
      status: 'success',
      message: 'Clinical note updated successfully.',
      data: { note },
    });
  } catch (error) {
    console.error('Error updating clinical note:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update clinical note.',
    });
  }
};

/**
 * @desc    Delete clinical note
 * @route   DELETE /api/notes/:id
 * @access  Private (Therapist)
 */
const deleteNote = async (req, res) => {
  try {
    const therapistId = req.therapist._id;
    const { id } = req.params;

    const note = await ClinicalNote.findOneAndDelete({ _id: id, therapistId });
    if (!note) {
      return res.status(404).json({
        status: 'error',
        message: 'Clinical note not found or access denied.',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Clinical note deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting clinical note:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete clinical note.',
    });
  }
};

/**
 * @desc    CRITICAL ACCESS-CONTROL: Get explicitly shared notes for client portal
 * @route   GET /api/notes/portal/:clientId
 * @access  Public / Client
 *
 * Enforces strict backend filtering:
 * 1. ONLY queries { visibility: 'shared' }
 * 2. Private notes are NEVER returned or queried
 * 3. Sanitized projection omitting internal therapist metadata
 */
const getClientPortalSharedNotes = async (req, res) => {
  try {
    const { clientId } = req.params;

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        status: 'error',
        message: 'Client record not found.',
      });
    }

    // STRICT ACCESS-CONTROL: Query explicitly shared notes ONLY
    const sharedNotes = await ClinicalNote.find({
      clientId: client._id,
      visibility: 'shared',
    })
      .select('title noteType contentHtml sharedAt sessionDate createdAt')
      .sort({ sessionDate: -1 });

    return res.status(200).json({
      status: 'success',
      data: {
        sharedNotes,
        total: sharedNotes.length,
      },
    });
  } catch (error) {
    console.error('Error fetching client portal shared notes:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve shared session notes.',
    });
  }
};

module.exports = {
  createNote,
  getNotesByClient,
  getNoteById,
  updateNote,
  deleteNote,
  getClientPortalSharedNotes,
};
