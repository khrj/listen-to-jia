import { randomBytes } from "crypto"
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

import { InstallationQuery, InstallProvider } from '@slack/oauth'
import { App, ExpressReceiver } from '@slack/bolt'

const receiver = new ExpressReceiver({ signingSecret: process.env.SLACK_SIGNING_SECRET! })

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    receiver
})

const jia = "U01HJ78R466"
const invalidReaction = "bangbang"

const installer = new InstallProvider({
    clientId: process.env.SLACK_CLIENT_ID!,
    clientSecret: process.env.SLACK_CLIENT_SECRET!,
    stateSecret: randomBytes(20).toString('hex'),
    installationStore: {
        storeInstallation: async (installation) => {
            await prisma.user.upsert({
                where: { slackID: installation.user.id },
                create: {
                    slackID: installation.user.id,
                    installation: JSON.stringify(installation)
                },
                update: {
                    installation: JSON.stringify(installation)
                }
            })
        },
        fetchInstallation: async (InstallQuery) => {
            const user = await prisma.user.findUnique({
                where: {
                    slackID: InstallQuery.userId
                }
            })

            return JSON.parse(user!.installation)
        },
    },
})

app.event('reaction_added', async ({ event }) => {
    if (event.user === jia && event.reaction === invalidReaction) {
        console.log("LISTEN")
        const result = await installer.authorize({ userId: event.item_user } as InstallationQuery<boolean>)

        if (result.userToken && "channel" in event.item) {
            await app.client.chat.delete({
                token: result.userToken,
                channel: event.item.channel,
                ts: event.item.ts
            })
        }
    }
})

async function main() {
    await app.start(process.env.PORT ? parseInt(process.env.PORT) : 3000)
    console.log('Listen to Jia running ‼️')
}
main()

receiver.router.get('/', async (_, res) => {
    const url = await installer.generateInstallUrl({
        scopes: ['channels:history', 'reactions:read'],
        userScopes: ["chat:write"],
    })
    res.redirect(url)
})

receiver.router.get('/slack/oauth_redirect', async (req, res) => {
    await installer.handleCallback(req, res)
})
