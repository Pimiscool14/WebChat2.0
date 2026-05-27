const Friendship = require("./models/Friendship")

function dmChatId(userA, userB) {
  return `dm:${[userA, userB].sort().join(":")}`
}

async function areFriends(userA, userB) {
  const row = await Friendship.findOne({
    status: "accepted",
    $or: [
      { from: userA, to: userB },
      { from: userB, to: userA }
    ]
  })
  return !!row
}

module.exports = { dmChatId, areFriends, dmRoomId: dmChatId }
