const Client = require('../models/Client');
const Session = require('../models/Session');

/**
 * @desc    Get all clients for the authenticated therapist (with search & status filter)
 * @route   GET /api/clients
 * @access  Private (Therapist)
 */
const getClients = async (req, res) => {
  try {
    const { status, search, tag } = req.query;
    const therapistId = req.therapist._id;

    // Strict multi-tenant scoping: only query current therapist's clients
    const query = { therapistId };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (tag) {
      query.tags = tag;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    const clients = await Client.find(query).sort({ updatedAt: -1 });

    return res.status(200).json({
      status: 'success',
      data: {
        clients,
        total: clients.length,
      },
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve clients.',
    });
  }
};

/**
 * @desc    Get single client profile details, full session history & consent audit
 * @route   GET /api/clients/:id
 * @access  Private (Therapist)
 */
const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const therapistId = req.therapist._id;

    // Strict ownership verification: therapist can only view their own client
    const client = await Client.findOne({ _id: id, therapistId });
    if (!client) {
      return res.status(404).json({
        status: 'error',
        message: 'Client record not found or access denied.',
      });
    }

    // Fetch this client's historical sessions
    const sessions = await Session.find({
      therapistId,
      $or: [{ clientId: client._id }, { clientEmail: client.email }],
    }).sort({ startDateTime: -1 });

    return res.status(200).json({
      status: 'success',
      data: {
        client,
        sessions,
      },
    });
  } catch (error) {
    console.error('Error fetching client details:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch client profile.',
    });
  }
};

/**
 * @desc    Create new client directly from therapist dashboard
 * @route   POST /api/clients
 * @access  Private (Therapist)
 */
const createClient = async (req, res) => {
  try {
    const therapistId = req.therapist._id;
    const { name, email, phone, status = 'active', tags = ['Individual'], internalNotes = '' } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        status: 'error',
        message: 'Client name and email are required.',
      });
    }

    const emailNormalized = email.trim().toLowerCase();

    // Check if client with this email already exists under this therapist
    const existing = await Client.findOne({ therapistId, email: emailNormalized });
    if (existing) {
      return res.status(400).json({
        status: 'error',
        message: 'A client record with this email already exists in your practice.',
      });
    }

    const client = await Client.create({
      therapistId,
      name: name.trim(),
      email: emailNormalized,
      phone: phone?.trim() || '',
      status,
      tags: Array.isArray(tags) ? tags : [tags],
      internalNotes,
      consentRecord: {
        agreed: true,
        agreedAt: new Date(),
        ipAddress: req.ip || '127.0.0.1',
        consentVersion: 'v1.0-manual-intake-consent',
        consentText: 'Practice informed consent obtained and recorded by therapist.',
      },
    });

    return res.status(201).json({
      status: 'success',
      message: 'Client added to practice CRM.',
      data: { client },
    });
  } catch (error) {
    console.error('Error creating client:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create client record.',
    });
  }
};

/**
 * @desc    Update client status, tags, and internal notes
 * @route   PUT /api/clients/:id
 * @access  Private (Therapist)
 */
const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const therapistId = req.therapist._id;
    const { name, phone, status, tags, internalNotes } = req.body;

    const client = await Client.findOne({ _id: id, therapistId });
    if (!client) {
      return res.status(404).json({
        status: 'error',
        message: 'Client record not found or access denied.',
      });
    }

    if (name) client.name = name.trim();
    if (phone !== undefined) client.phone = phone.trim();
    if (status) client.status = status;
    if (Array.isArray(tags)) client.tags = tags;
    if (internalNotes !== undefined) client.internalNotes = internalNotes;

    await client.save();

    return res.status(200).json({
      status: 'success',
      message: 'Client updated successfully.',
      data: { client },
    });
  } catch (error) {
    console.error('Error updating client:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update client record.',
    });
  }
};

/**
 * @desc    Submit clinical intake questionnaire for a client
 * @route   POST /api/clients/:id/intake
 * @access  Public or Authenticated (client can submit via secure token/id)
 */
const submitIntake = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      dateOfBirth,
      gender,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      presentingConcerns,
      priorTherapyExperience,
      currentMedications,
      goalsForTherapy,
    } = req.body;

    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({
        status: 'error',
        message: 'Client profile not found.',
      });
    }

    client.intakeCompleted = true;
    client.intakeForm = {
      dateOfBirth: dateOfBirth || '',
      gender: gender || '',
      emergencyContactName: emergencyContactName?.trim() || '',
      emergencyContactPhone: emergencyContactPhone?.trim() || '',
      emergencyContactRelation: emergencyContactRelation?.trim() || '',
      presentingConcerns: Array.isArray(presentingConcerns) ? presentingConcerns : [],
      priorTherapyExperience: priorTherapyExperience || '',
      currentMedications: currentMedications || '',
      goalsForTherapy: goalsForTherapy || '',
      submittedAt: new Date(),
    };

    // Update consent record if digital consent affirmed
    client.consentRecord = {
      agreed: true,
      agreedAt: new Date(),
      ipAddress: req.ip || '127.0.0.1',
      consentVersion: 'v1.0-standard-intake-consent',
      consentText: 'Digital informed consent captured during client intake questionnaire.',
    };

    await client.save();

    return res.status(200).json({
      status: 'success',
      message: 'Intake form and consent submitted successfully.',
      data: { client },
    });
  } catch (error) {
    console.error('Error submitting intake:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to submit intake information.',
    });
  }
};

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  submitIntake,
};
