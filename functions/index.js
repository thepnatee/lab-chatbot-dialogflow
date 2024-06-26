/*
Cloud Functions for Firebase 2nd Gen
https://medium.com/firebasethailand/cdda33bbd7dd

*/

const { setGlobalOptions} = require("firebase-functions/v2");
const { onRequest } = require("firebase-functions/v2/https");

setGlobalOptions({
    region: "asia-northeast1",
    memory: "1GB",
    concurrency: 40,
})



const line = require('./util/line.util');
const firebase = require('./util/firebase.util')
const dialogflow = require('./util/dialogflow.util');

function validateWebhook(request, response) {
    if (request.method !== "POST") {
        return response.status(200).send("Method Not Allowed");
    }
    if (!line.verifySignature(request.headers["x-line-signature"], request.body)) {
        return response.status(401).send("Unauthorized");
    }
}

exports.webhook = onRequest(async (request, response) => {

    // Midleware : Validate Message
    validateWebhook(request, response)

    const events = request.body.events
    for (const event of events) {

        if (event.type === "message" && event.message.type === "text") {


            if (event.source.type !== "group") {
                // Display a loading animation in one-on-one chats between users and LINE Official Accounts.
                await line.isAnimationLoading(event.source.userId)
            }
            profile = await line.getProfile(event.source.userId)

            console.log("profile ", profile);

            if (profile.isUseChatbot) {

                if (event.message.text === "ติดต่อเจ้าหน้าที่") {
                    firebase.updateUseChatbot(event.source.userId, false)

                    await line.replyWithStateless(event.replyToken, [{
                        "type": "text",
                        "text": 'ปิดระบบตอบกลับอัตโนมัติ ทำการส่งต่อให้เจ้าหน้าที่เรียบร้อย \r\n\r\n\r\nเมื่อการสนทนาเริ่มขึ้น หาก ลูกค้าไม่ตอบกลับนานเกินช่วงเวลา ข้อความจะส่งกลับหา ระบบตอบกลับ อัตโนมัติ',
                    }])

                    return response.end();
                }

                // Dialogflow
                await dialogflow.forwardDialodflow(request)
                return response.end();

            } else {
                if (event.message.text === "done") {

                    firebase.updateUseChatbot(event.source.userId, true)
                    await line.replyWithStateless(event.replyToken, [{
                        "type": "text",
                        "text": '[เปิดระบบโต้ตอบอัตโนมัติ] ขอบคุณ ที่ให้เจ้าหน้าที่ช่วยเหลือ ท่านสามารถสอบถามข้อมูลเพิ่มเติมได้เลยครับ',
                    }])

                    return response.end();
                }
            }
        }
    }
    return response.end();

});

exports.schedule = onRequest(async (request, response) => {


    if (!request.body.responseTimeChatbot) {
        return response.status(400).json({message:"Value Object: [responseTimeChatbot] is Found!"});
      }

    const userList = await firebase.getUsers()
    const currentTimestamp = Date.now();

    for (const item of userList) {
        const messagedTime = item.messagedDateTime;
        const diffInMilliseconds = currentTimestamp - messagedTime;
        const minutesDiff = Math.floor(diffInMilliseconds / (1000 * 60));
        
        // If the time exceeds 15 minutes, it will automatically switch to Bot mode.
        if (minutesDiff > request.body.responseTimeChatbot) {
            await firebase.updateUseChatbot(item.userId, true)
            // await line.isAnimationLoading(item.userId)
            await line.pushWithStateless(item.userId, [{
                "type": "text",
                "text": '[เปิดระบบโต้ตอบอัตโนมัติ] ขอบคุณ ที่ให้เจ้าหน้าที่ช่วยเหลือ ท่านสามารถสอบถามข้อมูลเพิ่มเติมได้เลยครับ',
            }])
        }
    }
    return response.status(200).send("Update");
});