const {
  initializeApp
} = require('firebase-admin/app');
const {
  getFirestore
} = require('firebase-admin/firestore');

initializeApp();

const db = getFirestore();
const userDb = db.collection("user")


/* Insert Member by userId and select */
exports.upsertUser = async (userId) => {
  const currentTimestamp = Date.now();
  const userDocument = await userDb.doc(userId).get()
  if (!userDocument.exists) {
    const newUser = {
      userId: userId,
      messagedDateTime: currentTimestamp,
      isUseChatbot: true,
    }
    await userDb.doc(userId).set(newUser)
    return newUser

  }

  await userDb.doc(userId).update({
    messagedDateTime: currentTimestamp
  });
  return userDocument.data();
}


/* Update isUseChatbot */
exports.updateUseChatbot = async (userId, status) => {
  try {
    return await userDb.doc(userId).update({
      isUseChatbot: status
    });;
  } catch (error) {
    console.error('Error updating user chatbot status:', error);
    throw error;
  }
}


exports.getUsers = async () => {
  try {

    const query = userDb.where('isUseChatbot', '==', false);
    const querySnapshot = await query.get();
    const users = querySnapshot.docs.map(doc => doc.data());

    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};