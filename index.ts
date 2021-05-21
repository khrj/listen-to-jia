import { PrismaClient } from "@prisma/client"
import { App } from "@slack/bolt"

const jia = "U01HJ78R466"
const invalidReaction = "bangbang"

const prisma = new PrismaClient()
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
})

app.event("reaction_added", async ({ event }) => {
    if (event.user === jia && event.reaction === invalidReaction) {
        console.log("LISTEN")

        if ("channel" in event.item && "ts" in event.item) {
            const user = await prisma.user.findUnique({
                where: {
                    slackID: event.item_user,
                },
            })

            if (user && user.enabled) {
                await app.client.chat.delete({
                    token: process.env.SLACK_ADMIN_TOKEN,
                    channel: event.item.channel,
                    ts: event.item.ts,
                })
            }
        }
    }
})

app.command("/l2j-toggle", async ({ command, ack, client }) => {
    // Acknowledge command request
    await ack()

    let currentUser = await prisma.user.findUnique({
        where: {
            slackID: command.user_id,
        },
    })

    if (!currentUser || !currentUser.enabled) {
        await prisma.user.upsert({
            where: {
                slackID: command.user_id,
            },
            create: {
                slackID: command.user_id,
                enabled: true,
            },
            update: {
                enabled: true,
            },
        })

        await client.chat.postEphemeral({
            channel: command.channel_id,
            user: command.user_id,
            text: "Listen to Jia enabled :owl:! Your incorrect messages will now be automatically deleted.",
        })
    } else {
        await prisma.user.update({
            where: {
                slackID: command.user_id,
            },
            data: {
                enabled: false,
            },
        })

        await client.chat.postEphemeral({
            channel: command.channel_id,
            user: command.user_id,
            text: "Listen to Jia disabled! Your incorrect messages will no longer be automatically deleted.",
        })
    }
})

async function main() {
    await app.start(process.env.PORT ? parseInt(process.env.PORT) : 3000)
    console.log("Listen to Jia running ‼️")
}

main()
    .catch(e => {
        throw e
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
