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

        if (event.source.type !== "group") {
            // Display a loading animation in one-on-one chats between users and LINE Official Accounts.
            await line.isAnimationLoading(event.source.userId)
        }

        if (event.type === "follow") {

            profile = await line.getProfile(event.source.userId)

            await line.replyWithStateless(event.replyToken, [{
                "type": "text",
                "text": `ยินดีต้อนรับคุณ ${profile.displayName} มีอะไรให้ฉันรับใช้`,
                "sender": {
                    "name": "BOT",
                    "iconUrl": "https://cdn-icons-png.flaticon.com/512/6349/6349320.png"
                },
                "quickReply": {
                    "items": [{
                            "type": "action",
                            "imageUrl": "https://cdn-icons-png.flaticon.com/512/2339/2339864.png",
                            "action": {
                                "type": "message",
                                "label": "สวัสดี",
                                "text": "สวัสดี"
                            }
                        },
                        {
                            "type": "action",
                            "imageUrl": "https://cdn-icons-png.flaticon.com/512/9136/9136041.png",
                            "action": {
                                "type": "message",
                                "label": "ติดต่อเจ้าหน้าที่",
                                "text": "ติดต่อเจ้าหน้าที่"
                            }
                        }
                    ]
                }
            }])

        }
        if (event.type === "message" && event.message.type === "text") {


            profile = await line.getProfile(event.source.userId)
            await firebase.upsertUser(userId)


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
                        "sender": {
                            "name": "BOT",
                            "iconUrl": "https://cdn-icons-png.flaticon.com/512/6349/6349320.png"
                        },
                        "quickReply": {
                            "items": [{
                                    "type": "action",
                                    "imageUrl": "https://cdn-icons-png.flaticon.com/512/2339/2339864.png",
                                    "action": {
                                        "type": "message",
                                        "label": "สวัสดี",
                                        "text": "สวัสดี"
                                    }
                                },
                                {
                                    "type": "action",
                                    "imageUrl": "https://cdn-icons-png.flaticon.com/512/9136/9136041.png",
                                    "action": {
                                        "type": "message",
                                        "label": "ติดต่อเจ้าหน้าที่",
                                        "text": "ติดต่อเจ้าหน้าที่"
                                    }
                                }
                            ]
                        }
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
        return response.status(400).json({
            message: "Value Object: [responseTimeChatbot] is Found!"
        });
    }

    const userList = await firebase.getUsers()

    for (const item of userList) {
        const messagedTime = item.messagedDateTime;
        const diffInMilliseconds = currentTimestamp - messagedTime;
        const minutesDiff = Math.floor(diffInMilliseconds / (1000 * 60));

        // If the time exceeds [xx] minutes, it will automatically switch to Bot mode.
        if (minutesDiff > request.body.responseTimeChatbot) {
            await firebase.updateUseChatbot(item.userId, true)
            await line.isAnimationLoading(item.userId)
            await line.pushWithStateless(item.userId, [{
                "type": "text",
                "text": '[เปิดระบบโต้ตอบอัตโนมัติ] ขอบคุณ ที่ให้เจ้าหน้าที่ช่วยเหลือ ท่านสามารถสอบถามข้อมูลเพิ่มเติมได้เลยครับ',
                "sender": {
                    "name": "BOT",
                    "iconUrl": "https://cdn-icons-png.flaticon.com/512/6349/6349320.png"
                },
                "quickReply": {
                    "items": [{
                            "type": "action",
                            "imageUrl": "https://cdn-icons-png.flaticon.com/512/2339/2339864.png",
                            "action": {
                                "type": "message",
                                "label": "สวัสดี",
                                "text": "สวัสดี"
                            }
                        },
                        {
                            "type": "action",
                            "imageUrl": "https://cdn-icons-png.flaticon.com/512/9136/9136041.png",
                            "action": {
                                "type": "message",
                                "label": "ติดต่อเจ้าหน้าที่",
                                "text": "ติดต่อเจ้าหน้าที่"
                            }
                        }
                    ]
                }
            }])
        }
    }
    return response.status(200).send("Updated");
});