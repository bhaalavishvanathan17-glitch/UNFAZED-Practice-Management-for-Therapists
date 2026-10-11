const ioClient = require('socket.io-client');
const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';
const SOCKET_URL = 'http://localhost:5001';

async function runModule6Verification() {
  console.log('====================================================');
  console.log('🧪 UNFAZED MODULE 6: COMMUNICATION & NOTIFICATIONS TEST');
  console.log('====================================================\n');

  try {
    // 1. Authenticate Therapist
    console.log('1. Authenticating Demo Therapist...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'dr.kabir@unfazed.test',
      password: 'password123',
    });
    const token = loginRes.data.data.token;
    const therapist = loginRes.data.data.therapist;
    console.log(`✅ Therapist authenticated: ${therapist.name} (ID: ${therapist._id})`);

    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // 2. Fetch Clients & Pick Maya Patel
    console.log('\n2. Fetching Client CRM List...');
    const clientsRes = await axios.get(`${API_BASE}/clients`, authHeaders);
    const clients = clientsRes.data.data.clients;
    if (!clients || clients.length === 0) {
      throw new Error('No clients found in database for test.');
    }
    const client = clients[0];
    console.log(`✅ Selected Client: ${client.name} (ID: ${client._id}, Email: ${client.email})`);

    // 3. Get or Create Conversation
    console.log('\n3. Opening Conversation Thread...');
    const convRes = await axios.post(
      `${API_BASE}/conversations`,
      { clientId: client._id },
      authHeaders
    );
    const conversation = convRes.data.data.conversation;
    console.log(`✅ Conversation Thread Opened: ID ${conversation._id}`);

    // 4. Send Message via HTTP REST Fallback
    console.log('\n4. Testing HTTP REST Fallback Message Dispatch...');
    const restMsgRes = await axios.post(
      `${API_BASE}/conversations/${conversation._id}/messages`,
      {
        content: 'Hello Maya, this is an automated confirmation of our upcoming appointment.',
        senderType: 'therapist',
        senderName: therapist.name,
      },
      authHeaders
    );
    console.log(`✅ HTTP Message Sent: ID ${restMsgRes.data.data.message._id}`);

    // 5. Query Messages History
    console.log('\n5. Fetching Conversation Messages...');
    const msgsRes = await axios.get(
      `${API_BASE}/conversations/${conversation._id}/messages`,
      authHeaders
    );
    console.log(`✅ Retrieved ${msgsRes.data.data.total} messages in conversation.`);

    // 6. Test Client Portal Direct Chat Endpoint
    console.log('\n6. Testing Client Portal Chat Endpoint (Zero-Auth Client Access)...');
    const portalRes = await axios.get(`${API_BASE}/client-portal/${client._id}`);
    const portalData = portalRes.data.data;
    console.log(`✅ Client Portal Chat loaded for ${portalData.client.name}:`);
    console.log(`   - Therapist: ${portalData.therapist.name}`);
    console.log(`   - Conversation ID: ${portalData.conversation._id}`);
    console.log(`   - Message Count: ${portalData.messages.length}`);

    // 7. Test In-App Notifications
    console.log('\n7. Testing In-App Notifications API...');
    const notifRes = await axios.get(`${API_BASE}/notifications`, authHeaders);
    console.log(`✅ Retrieved ${notifRes.data.data.notifications.length} notifications (Unread: ${notifRes.data.data.unreadCount})`);

    if (notifRes.data.data.notifications.length > 0) {
      const firstNotif = notifRes.data.data.notifications[0];
      const markRes = await axios.patch(
        `${API_BASE}/notifications/${firstNotif._id}/read`,
        {},
        authHeaders
      );
      console.log(`✅ Marked notification read: ${markRes.data.data.notification._id} (isRead: ${markRes.data.data.notification.isRead})`);
    }

    const readAllRes = await axios.patch(
      `${API_BASE}/notifications/read-all`,
      {},
      authHeaders
    );
    console.log(`✅ Read All Notifications: ${readAllRes.data.message}`);

    // 8. Test Real-time Socket.IO Bidirectional Communication
    console.log('\n8. Testing Socket.IO Bidirectional Real-time Communication...');
    await new Promise((resolve, reject) => {
      const therapistSocket = ioClient(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
      });

      const clientSocket = ioClient(SOCKET_URL, {
        auth: { clientId: client._id },
        transports: ['websocket'],
      });

      let clientJoined = false;
      let therapistJoined = false;
      let messageDelivered = false;
      let typingReceived = false;

      const finishIfDone = () => {
        if (messageDelivered && typingReceived) {
          therapistSocket.disconnect();
          clientSocket.disconnect();
          console.log('✅ Socket.IO Tests fully passed!');
          resolve();
        }
      };

      therapistSocket.on('connect', () => {
        console.log('   -> Therapist socket connected');
        therapistSocket.emit('join_conversation', { conversationId: conversation._id }, (res) => {
          therapistJoined = true;
          checkStartMessaging();
        });
      });

      clientSocket.on('connect', () => {
        console.log('   -> Client socket connected');
        clientSocket.emit('join_conversation', { conversationId: conversation._id }, (res) => {
          clientJoined = true;
          checkStartMessaging();
        });
      });

      clientSocket.on('user_typing', ({ senderName, isTyping }) => {
        console.log(`   -> Client received typing indicator: "${senderName}" typing=${isTyping}`);
        typingReceived = true;
        finishIfDone();
      });

      clientSocket.on('new_message', (msg) => {
        console.log(`   -> Client received real-time new_message: "${msg.content}" (Sender: ${msg.senderName})`);
        messageDelivered = true;

        // Test Mark Read from Client
        clientSocket.emit('mark_read', { conversationId: conversation._id, userRole: 'client' });

        // Test Therapist Typing
        therapistSocket.emit('typing', {
          conversationId: conversation._id,
          senderName: therapist.name,
        });
      });

      function checkStartMessaging() {
        if (clientJoined && therapistJoined) {
          console.log('   -> Both sockets joined room conversation:' + conversation._id);
          therapistSocket.emit('send_message', {
            conversationId: conversation._id,
            content: 'Real-time Socket.IO test payload: Hope you are doing well today!',
            senderType: 'therapist',
            senderName: therapist.name,
          });
        }
      }

      setTimeout(() => {
        therapistSocket.disconnect();
        clientSocket.disconnect();
        if (!messageDelivered) {
          reject(new Error('Socket test timed out waiting for message delivery.'));
        } else {
          resolve();
        }
      }, 7000);
    });

    console.log('\n====================================================');
    console.log('🎉 ALL MODULE 6 COMMUNICATION CHECKS PASSED SUCCESSFULLY!');
    console.log('====================================================\n');
  } catch (error) {
    console.error('❌ Module 6 Verification Failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

runModule6Verification();
