/*
Cloud Functions for Firebase 2nd Gen
https://medium.com/firebasethailand/cdda33bbd7dd

*/

const {
    setGlobalOptions
} = require("firebase-functions/v2");
const {
    onRequest
} = require("firebase-functions/v2/https");
setGlobalOptions({
    region: "asia-northeast1",
    memory: "1GB",
    concurrency: 40,
})


const line = require('./util/line.util');
const nodeCache = require('./util/node-cache.util');
const dialogflow = require('./util/dialogflow.util');

function validateWebhook(request, response) {
    if (request.method !== "POST") {
        return response.status(200).send("Method Not Allowed");
    }
    if (!line.verifySignature(request.headers["x-line-signature"], request.body)) {
        return response.status(401).send("Unauthorized");
    }
}

// user send message 
// -> get and add profile  to cache 
// -> update message lasted message  expire 5 min  
// -> reply message 'ปิดระบบบอทอัตโนมัติ ทำการส่งต่อให้เจ้าหน้าที่เรียบร้อย เมื่อการสนทนาเริ่มขึ้น หาก ลูกค้าไม่ตอบกลับภายใน 5 นาที ข้อความจะส่งกลับหา ระบบตอบกลับ อัตโนมัติ'



exports.webhook = onRequest(async (request, response) => {

    // Midleware : Validate Message
    validateWebhook(request, response)

    const events = request.body.events
    for (const event of events) {

        console.log("event", JSON.stringify(event));

        if (event.type === "message" && event.message.type === "text") {


            // get and insertUpdate to Cache
            profile = await line.getProfile(event.source.userId)

            if (event.source.type !== "group") {
                // Display a loading animation in one-on-one chats between users and LINE Official Accounts.
                await line.isAnimationLoading(event.source.userId)
            }

            if (event.message.text === "ติดต่อเจ้าหน้าที่") {
                
                await line.replyWithLongLived(event.replyToken, [{
                    "type": "text",
                    "text": 'ปิดระบบตอบกลับอัตโนมัติ ทำการส่งต่อให้เจ้าหน้าที่เรียบร้อย \r\n\r\n\r\nเมื่อการสนทนาเริ่มขึ้น หาก ลูกค้าไม่ตอบกลับภายใน 5 นาที ข้อความจะส่งกลับหา ระบบตอบกลับ อัตโนมัติ',
                }])

                return response.end();
            } else if (event.message.text === "ok") {


                await line.replyWithLongLived(event.replyToken, [{
                    "type": "text",
                    "text": 'เปิดระบบตอบกลับอัตโนมัติ',
                }])

                return response.end();
            } else {

                // Dialogflow
                await dialogflow.forwardDialodflow(request)
                return response.end();

            }

        }

    }

    return response.end();

});