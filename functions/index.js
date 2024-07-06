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

            const profile = await line.getProfile(event.source.userId)

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

            const user = await firebase.upsertUser(event.source.userId)
            if (user) {
                if (event.message.text === "ติดต่อเจ้าหน้าที่") {
                    const profile = await line.getProfile(event.source.userId)
                    firebase.updateUseChatbot(event.source.userId, false)
                    await line.pushLineNotify(`พบการขอความช่วยเหลือจาก คุณ ${profile.displayName}`);
                    await line.replyWithStateless(event.replyToken, [{
                        "type": "text",
                        "text": "ระบบกำลังส่งบทสนทนาของท่านให้เจ้าหน้าที่ เจ้าหน้าที่จะทำการตอบกลับโดยเร็วที่สุด\nเพื่อความรวดเร็วในการให้บริการกรุณาระบุข้อมูลดังนี้ค่ะ :\n- เรื่องที่ต้องการติดต่อ\n- หมายเลขคำสั่งซื้อ\n- ชื่อ เบอร์โทรศัพท์ และ Email ที่ลงทะเบียนไว้กับ xxxx ค่ะ",
                    }])

                    return response.end();

                } else {
                    // Dialogflow
                    await dialogflow.forwardDialodflow(request)
                    return response.end();
                }
            }


            if (event.message.text === "done") {

                firebase.updateUseChatbot(event.source.userId, true)
                await line.replyWithStateless(event.replyToken, [{
                    "type": "text",
                    "text": 'ขอบคุณ ที่ให้เจ้าหน้าที่ช่วยเหลือนะคะ',
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
    return response.end();

});

exports.schedule = onRequest(async (request, response) => {

    if (request.method !== "POST") {
        return response.status(200).send("Method Not Allowed");
    }

    if (!request.body.responseTimeChatbot) {
        return response.status(400).json({
            message: "Value Object: [responseTimeChatbot] is Found!"
        });
    }

    const userList = await firebase.getUsers()

    for (const item of userList) {
        const messagedTime = item.messagedDateTime;
        const diffInMilliseconds = Date.now() - messagedTime;
        const minutesDiff = Math.floor(diffInMilliseconds / (1000 * 60));
        console.info("[schedule] minutesDiff : ", minutesDiff);
        // If the time exceeds [xx] minutes, it will automatically switch to Bot mode.
        if (minutesDiff > request.body.responseTimeChatbot) {
            await firebase.updateUseChatbot(item.userId, true)
            await line.isAnimationLoading(item.userId)
            await line.pushWithStateless(item.userId, [{
                "type": "text",
                "text": 'ขอบคุณ ที่ให้เจ้าหน้าที่ช่วยเหลือนะคะ',
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