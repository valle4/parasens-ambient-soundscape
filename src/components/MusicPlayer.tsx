import { useState } from "react";
import useScrollReveal from "@/hooks/useScrollReveal";

interface Track {
  id: number;
  title: string;
  artist: string;
  genre: string;
  subCategory: string;
  spotifyId: string;
}

const genres = [
  "All",
  "Piano",
  "Jazz",
  "Acoustic Cover",
  "Classical",
  "Lullabies",
  "Christmas",
  "Christian",
  "Ambient",
  "LoFi",
  "Phonk",
];

// ============================================
// EDIT SUB-CATEGORIES HERE
// Each genre has its own list of sub-categories
// ============================================
const subCategories: Record<string, string[]> = {
  Piano: ["Peaceful Piano", "Piano Cover", "Piano & Nature", "Hymns"],
  Jazz: ["Smooth", "Classic", "Bossa Nova"],
  "Acoustic Cover": ["Vocal Cover", "Guitar Cover"],
  Classical: ["Modern", "Traditional", "Cinematic"],
  Lullabies: ["Gentle", "Dreamy", "Playful"],
  Christmas: ["Traditional", "Cozy", "Festive"],
  Christian: ["Hymns", "Worship", "Peaceful"],
  Ambient: ["Ethereal", "Dark", "Nature"],
  LoFi: ["Chill", "Study", "Night"],
  Phonk: ["Hard", "Drift", "Sped Up"],
};

// ============================================
// EDIT TRACKS HERE
// Each track has: id, title, artist, genre, subCategory, spotifyId
// ============================================
const tracks: Track[] = [
  // Piano - Soft
  {
    id: 1,
    title: "Ponceau",
    artist: "Ray Love",
    genre: "Piano",
    subCategory: "Peaceful Piano",
    spotifyId: "1qCrvHUu3jt5oSpvYaVrwH",
  },
  {
    id: 2,
    title: "estiu",
    artist: "Valentine Summers",
    genre: "Piano",
    subCategory: "Peaceful Piano",
    spotifyId: "1vzwRWE2Vj7JZwqBqi9ivM",
  },
  {
    id: 3,
    title: "Juliet Rose",
    artist: "A Little Time",
    genre: "Piano",
    subCategory: "Peaceful Piano",
    spotifyId: "5eiXYdSRFd48jBqnQrw83h",
  },
  {
    id: 4,
    title: "Echidna",
    artist: "Northern Dreams",
    genre: "Piano",
    subCategory: "Peaceful Piano",
    spotifyId: "66IOe8PcQPacJ3D3MtGLMS",
  },
  { id: 5, title: "sēnse", artist: "ispirà", genre: "Piano", subCategory: "Soft", spotifyId: "7xAEN2uqrL8MGnpuyAbrmd" },
  // Piano - Emotional
  {
    id: 6,
    title: "From a Distance",
    artist: "Mindy Thurma",
    genre: "Piano",
    subCategory: "Peaceful Piano",
    spotifyId: "7DSAwNkmall9lAltVsoWFw",
  },
  {
    id: 7,
    title: "The Years Grew Quiet",
    artist: "Giorgio Rossi",
    genre: "Piano",
    subCategory: "Peaceful Piano",
    spotifyId: "5TjMmdE5zIWUrFhBqL9Lge",
  },
  {
    id: 8,
    title: "Ember",
    artist: "Lunar Lull",
    genre: "Piano",
    subCategory: "Peaceful Piano",
    spotifyId: "7yZcjQGSDcKdxAmxJ7rvqd",
  },
  {
    id: 9,
    title: "Jade Vine",
    artist: "Moonsong",
    genre: "Piano",
    subCategory: "Peaceful Piano",
    spotifyId: "6rr10DYH1fRl2r1JATikzT",
  },
  {
    id: 10,
    title: "Between Heartbeats",
    artist: "Cassian Lake",
    genre: "Piano",
    subCategory: "Peaceful Piano",
    spotifyId: "4WxEAxB8e317cYBRwz9NaO",
  },
  // Piano - Uplifting
  {
    id: 11,
    title: "Ashlight",
    artist: "Runā Væra",
    genre: "Piano",
    subCategory: "Uplifting",
    spotifyId: "0opEMDtj6BWB0zitXoJx5d",
  },
  {
    id: 12,
    title: "Messy",
    artist: "Runā Væra",
    genre: "Piano",
    subCategory: "Uplifting",
    spotifyId: "4fK6LMhdx6DCFO4ShQsvI3",
  },
  {
    id: 13,
    title: "Still Crazy After All These Years",
    artist: "Runā Væra",
    genre: "Piano",
    subCategory: "Uplifting",
    spotifyId: "5nC0JYo9VuvDMBzMlgVAvY",
  },
  {
    id: 14,
    title: "I Love Every Little Thing About You",
    artist: "Runā Væra",
    genre: "Piano",
    subCategory: "Uplifting",
    spotifyId: "4m78bGAE8y27nVVvo88L5M",
  },
  {
    id: 15,
    title: "Iris",
    artist: "Allena",
    genre: "Piano",
    subCategory: "Uplifting",
    spotifyId: "4ZXTjnWKgkJdcOu41Izs7d",
  },
  {
    id: 22,
    title: "Serevine",
    artist: "A Whisper",
    genre: "Piano",
    subCategory: "Soft",
    spotifyId: "1U7fnO16fpCkir1Z8RDdt3",
  },
  {
    id: 28,
    title: "Another Time",
    artist: "Northern Dreams",
    genre: "Piano",
    subCategory: "Emotional",
    spotifyId: "7lk8jlre48y3teEbgRvrMT",
  },
  {
    id: 33,
    title: "Silver Starling",
    artist: "Maurillo",
    genre: "Piano",
    subCategory: "Soft",
    spotifyId: "5rwMEeR0gsn2pivUE2R99J",
  },

  // Acoustic Cover - Pop Hits
  {
    id: 16,
    title: "Beautiful Things",
    artist: "Esther & John",
    genre: "Acoustic Cover",
    subCategory: "Pop Hits",
    spotifyId: "6nnNpzVfOVfYcTlAwNnTzU",
  },
  {
    id: 17,
    title: "Man I Need",
    artist: "Esther & John",
    genre: "Acoustic Cover",
    subCategory: "Pop Hits",
    spotifyId: "6UuKo0mzNdThLwt1DlobiP",
  },
  {
    id: 18,
    title: "feelslikeimfallinginlove",
    artist: "Esther & John",
    genre: "Acoustic Cover",
    subCategory: "Pop Hits",
    spotifyId: "2x60ePnBzW1db4JOyxBW6u",
  },
  // Acoustic Cover - Duets
  {
    id: 19,
    title: "Birds of a Feather",
    artist: "Gustav & Julia",
    genre: "Acoustic Cover",
    subCategory: "Duets",
    spotifyId: "6Mcwnd9E7rhABPZUPZpxCX",
  },
  {
    id: 20,
    title: "Kiss - Acoustic Version",
    artist: "Gustav & Julia",
    genre: "Acoustic Cover",
    subCategory: "Duets",
    spotifyId: "0J9liajekfS7m5egdYmmbD",
  },
  // Acoustic Cover - Ballads
  {
    id: 78,
    title: "Man I Need",
    artist: "Irving O'Neill",
    genre: "Acoustic Cover",
    subCategory: "Ballads",
    spotifyId: "37CfzvKVcteIFeNXfocxvG",
  },
  {
    id: 79,
    title: "Birds of a Feather",
    artist: "The Happy Cat",
    genre: "Acoustic Cover",
    subCategory: "Ballads",
    spotifyId: "6xH9KARVKHPKlYYXpYDVni",
  },
  {
    id: 80,
    title: "Beautiful Things",
    artist: "Wonder Wave",
    genre: "Acoustic Cover",
    subCategory: "Ballads",
    spotifyId: "4Uv8fcqdKavS1tcH5rIXKg",
  },

  // Jazz - Smooth
  {
    id: 21,
    title: "Blue Haze",
    artist: "Ray Love Trio",
    genre: "Jazz",
    subCategory: "Smooth",
    spotifyId: "1s1l7ksPaqruuvc4LdCH6f",
  },
  {
    id: 23,
    title: "Evening Sun",
    artist: "Alec Taylor Trio",
    genre: "Jazz",
    subCategory: "Smooth",
    spotifyId: "5Kwzs76HmFATFfdAHEN1tw",
  },
  {
    id: 24,
    title: "The Quiet Storm",
    artist: "Andy Luma Trio",
    genre: "Jazz",
    subCategory: "Smooth",
    spotifyId: "5caSbCpxmMVfAdq6wt37nF",
  },
  {
    id: 27,
    title: "Midnight Drift",
    artist: "Urskogen Jazz",
    genre: "Jazz",
    subCategory: "Smooth",
    spotifyId: "6UjkXOZj0kZB3XTJrGxoIS",
  },
  // Jazz - Classic
  {
    id: 25,
    title: "The Things We Did Last Summer",
    artist: "Einar Magnusson",
    genre: "Jazz",
    subCategory: "Classic",
    spotifyId: "2kZE2oq2A6IdoXFxNEVQwV",
  },
  {
    id: 26,
    title: "A Wayfarer's Tale",
    artist: "Ray Love Trio",
    genre: "Jazz",
    subCategory: "Classic",
    spotifyId: "0RrvMxwdAX6qBQHjR3EEPZ",
  },
  {
    id: 29,
    title: "This Time Tomorrow",
    artist: "Helmut Cole Trio",
    genre: "Jazz",
    subCategory: "Classic",
    spotifyId: "7s8J2SLXguqAT8RqoqSXoh",
  },
  {
    id: 30,
    title: "Flamingo",
    artist: "Ray Love",
    genre: "Jazz",
    subCategory: "Classic",
    spotifyId: "5hUBEW72nvmwnibrFUFemr",
  },
  {
    id: 31,
    title: "For Sentimental Reasons",
    artist: "Ray Love Trio",
    genre: "Jazz",
    subCategory: "Classic",
    spotifyId: "16XLUnjRsRJ2ZAUTsxCH1D",
  },
  {
    id: 32,
    title: "Spring Green",
    artist: "Einar Magnusson",
    genre: "Jazz",
    subCategory: "Classic",
    spotifyId: "0Yn1xmq6NE9XWeUBnPGyb6",
  },
  // Jazz - Bossa Nova
  {
    id: 34,
    title: "O Sol e Você",
    artist: "Douglas Ruby Trio",
    genre: "Jazz",
    subCategory: "Bossa Nova",
    spotifyId: "4vNwnJae8o9CEB2FMriGCa",
  },
  {
    id: 35,
    title: "In the Arms of the Moon",
    artist: "Irvin Smith Group",
    genre: "Jazz",
    subCategory: "Bossa Nova",
    spotifyId: "1IyTd7bacOtYouAi2LSknM",
  },
  {
    id: 36,
    title: "A Última Canção",
    artist: "Karl-Erik Trio",
    genre: "Jazz",
    subCategory: "Bossa Nova",
    spotifyId: "5mGMnKiVkI4QQAnlfZBGWh",
  },
  {
    id: 37,
    title: "Noite de Luzes Perdidas",
    artist: "Alec Taylor Trio",
    genre: "Jazz",
    subCategory: "Bossa Nova",
    spotifyId: "3dA9qQ6WTCCKbFcrlzV3gI",
  },
  {
    id: 38,
    title: "In Every Gaze",
    artist: "Isac Solo Trio",
    genre: "Jazz",
    subCategory: "Bossa Nova",
    spotifyId: "0okadaNpxIXbYtMOMoIg9Z",
  },
  {
    id: 39,
    title: "Star Rain",
    artist: "Ray Love Trio",
    genre: "Jazz",
    subCategory: "Bossa Nova",
    spotifyId: "1H2mfBUP4SJ8rXoYp7Ylpy",
  },
  {
    id: 40,
    title: "Rastro de Luz",
    artist: "Kristian Hart Trio",
    genre: "Jazz",
    subCategory: "Bossa Nova",
    spotifyId: "4owVHaczMrY21ppWgasyx7",
  },

  // Christmas - Traditional
  {
    id: 41,
    title: "Christmas Is Coming",
    artist: "Isac Solo Trio",
    genre: "Christmas",
    subCategory: "Traditional",
    spotifyId: "149nYuNSxKF3rPGpReOjtv",
  },
  {
    id: 49,
    title: "Go Tell It on the Mountain",
    artist: "Karl-Erik Trio",
    genre: "Christmas",
    subCategory: "Traditional",
    spotifyId: "0DX11hT4Ff6ST0WeaNHbta",
  },
  {
    id: 50,
    title: "O Come, All Ye Faithful",
    artist: "Antonia Woodhouse",
    genre: "Christmas",
    subCategory: "Traditional",
    spotifyId: "4IBNav8NPSTK7sMjfhcCOE",
  },
  {
    id: 53,
    title: "O Holy Night",
    artist: "Allena",
    genre: "Christmas",
    subCategory: "Traditional",
    spotifyId: "2yg9O6lrukgGWUks9gInhD",
  },
  // Christmas - Cozy
  {
    id: 42,
    title: "Christmas Serenade",
    artist: "Eternal Time Trio",
    genre: "Christmas",
    subCategory: "Cozy",
    spotifyId: "4Jd9637OEC5AtH3JEXqS16",
  },
  {
    id: 43,
    title: "The Snowman's Song",
    artist: "Irvin Smith Group",
    genre: "Christmas",
    subCategory: "Cozy",
    spotifyId: "3J8ksIbjusqpBOiIIR126Y",
  },
  {
    id: 46,
    title: "The Gift (By the Fireplace)",
    artist: "Alec Taylor",
    genre: "Christmas",
    subCategory: "Cozy",
    spotifyId: "0u9SdMGpKcEWiCKJmo6FaI",
  },
  {
    id: 47,
    title: "The Gift",
    artist: "Ray Love Trio",
    genre: "Christmas",
    subCategory: "Cozy",
    spotifyId: "1aQdyHGM4yBgzJQAvAK1c9",
  },
  {
    id: 52,
    title: "Auld Lang Syne",
    artist: "Noa Figaro",
    genre: "Christmas",
    subCategory: "Cozy",
    spotifyId: "2GAk05oJ7yvQ4gpZ1Y6cRQ",
  },
  // Christmas - Festive
  {
    id: 44,
    title: "Let's Go for a Sleigh Ride",
    artist: "Douglas Ruby Trio",
    genre: "Christmas",
    subCategory: "Festive",
    spotifyId: "47R5PBxbTYYFJlOlDKE4Pa",
  },
  {
    id: 45,
    title: "The Lights of Christmas",
    artist: "Kristian Hart Trio",
    genre: "Christmas",
    subCategory: "Festive",
    spotifyId: "47MoUrhCysfTKpsgoMR6Tm",
  },
  {
    id: 48,
    title: "Silver and Gold",
    artist: "Irvin Smith Group",
    genre: "Christmas",
    subCategory: "Festive",
    spotifyId: "0AwwVWuQqlDnNKigbSgxzK",
  },
  {
    id: 51,
    title: "When You Wish Upon a Star",
    artist: "Damien May",
    genre: "Christmas",
    subCategory: "Festive",
    spotifyId: "4h7Kp6xwI446WeM0VUBUzC",
  },
  {
    id: 54,
    title: "It's Beginning to Look a Lot Like Christmas",
    artist: "Rob Tomas",
    genre: "Christmas",
    subCategory: "Festive",
    spotifyId: "1VPmQMIY3Yjtaz6Bnzwqxh",
  },
  {
    id: 55,
    title: "Blue Christmas",
    artist: "Irving O'Neill",
    genre: "Christmas",
    subCategory: "Festive",
    spotifyId: "0GtHRKHzS40gITCF8EiUAF",
  },

  // Classical - Modern
  {
    id: 56,
    title: "Etude No. 5 - Felt Piano Version",
    artist: "Philip Glass, Johan Kwan",
    genre: "Classical",
    subCategory: "Modern",
    spotifyId: "7lR3Nl9YNqGs7MZDH9fNd5",
  },
  {
    id: 58,
    title: "Glassworks: I. Opening - Felt Piano",
    artist: "Johan Kwan",
    genre: "Classical",
    subCategory: "Modern",
    spotifyId: "0Wqz4sZjzNW9fnaCIKHQiL",
  },
  {
    id: 59,
    title: "Metamorphosis One",
    artist: "Johan Kwan",
    genre: "Classical",
    subCategory: "Modern",
    spotifyId: "3Cid9c0axfr4B9ODMdpOzE",
  },
  {
    id: 61,
    title: "Glassworks: Opening",
    artist: "Johan Kwan",
    genre: "Classical",
    subCategory: "Modern",
    spotifyId: "0DwYvpDam6dZhiJq4vaQxJ",
  },
  {
    id: 63,
    title: "Etude No. 5",
    artist: "Philip Glass, Johan Kwan",
    genre: "Classical",
    subCategory: "Modern",
    spotifyId: "4N0aK2Z7qjkBKDq24C1s0i",
  },
  // Classical - Cinematic
  {
    id: 57,
    title: "Elegy for the Arctic",
    artist: "Isabella Söderberg",
    genre: "Classical",
    subCategory: "Cinematic",
    spotifyId: "3GwOQwoOnQdfnjNVKCwjxW",
  },
  {
    id: 60,
    title: "Truman Sleeps",
    artist: "Isabella Söderberg",
    genre: "Classical",
    subCategory: "Cinematic",
    spotifyId: "03lcDAQZdtgqzGJamAxtHI",
  },
  // Classical - Traditional
  {
    id: 62,
    title: "3 Gymnopédies: No. 1 - Cello Version",
    artist: "Erik Satie, Isabella Söderberg",
    genre: "Classical",
    subCategory: "Traditional",
    spotifyId: "7MpOoMpD2zt6dJ1PlasE0e",
  },

  // Lullabies - Gentle
  {
    id: 64,
    title: "Yawning",
    artist: "Rosa Kindstrand",
    genre: "Lullabies",
    subCategory: "Gentle",
    spotifyId: "1sQx9bypnw0LOHkqpORqxO",
  },
  {
    id: 65,
    title: "Little Heart",
    artist: "Månljus",
    genre: "Lullabies",
    subCategory: "Gentle",
    spotifyId: "3DzkAjFXZVd9Sk6KBFpcss",
  },
  {
    id: 70,
    title: "Flower Petals",
    artist: "Lantern",
    genre: "Lullabies",
    subCategory: "Gentle",
    spotifyId: "1YGY4AeXwNARWJ1iYyddRi",
  },
  {
    id: 71,
    title: "Snowdrop",
    artist: "Douglas Ruby",
    genre: "Lullabies",
    subCategory: "Gentle",
    spotifyId: "36qNynUmExvLMosT826GIJ",
  },
  {
    id: 77,
    title: "Beetle",
    artist: "Rosa Kindstrand",
    genre: "Lullabies",
    subCategory: "Gentle",
    spotifyId: "71M4sox6ulygaWTksIAlyG",
  },
  // Lullabies - Dreamy
  {
    id: 66,
    title: "My Friend is Mine",
    artist: "Goodnight sweetheart",
    genre: "Lullabies",
    subCategory: "Dreamy",
    spotifyId: "5yYMMdbChJzV8zCsG623qB",
  },
  {
    id: 67,
    title: "Twinklepaws",
    artist: "Goodnight sweetheart",
    genre: "Lullabies",
    subCategory: "Dreamy",
    spotifyId: "7DxNaPj5FZrMrScOmYAdvp",
  },
  {
    id: 68,
    title: "Angel Eyes",
    artist: "Goodnight sweetheart",
    genre: "Lullabies",
    subCategory: "Dreamy",
    spotifyId: "1pYhOdETtHjHywmp2jNCaS",
  },
  {
    id: 69,
    title: "Best Friends",
    artist: "Goodnight sweetheart",
    genre: "Lullabies",
    subCategory: "Dreamy",
    spotifyId: "2wwpOSNHJKPw8SUyqpq0gl",
  },
  // Lullabies - Playful
  {
    id: 72,
    title: "Flufftail",
    artist: "The Stories We Tell",
    genre: "Lullabies",
    subCategory: "Playful",
    spotifyId: "6jer7vbiRBAlFfphQd3cE9",
  },
  {
    id: 73,
    title: "Gigglepaws",
    artist: "The Stories We Tell",
    genre: "Lullabies",
    subCategory: "Playful",
    spotifyId: "0OKnujtaEPOi8KIR7zpQo2",
  },
  {
    id: 74,
    title: "Little Farmboy",
    artist: "Maurillo",
    genre: "Lullabies",
    subCategory: "Playful",
    spotifyId: "707SGKBJOKGZtEUayuXoFp",
  },
  {
    id: 75,
    title: "Hush Now Little Lamb",
    artist: "Holy Day",
    genre: "Lullabies",
    subCategory: "Playful",
    spotifyId: "2QhKyPInwRf0gqjWiu4VVm",
  },
  {
    id: 76,
    title: "Sleepy Snowflake",
    artist: "Noel Keys",
    genre: "Lullabies",
    subCategory: "Playful",
    spotifyId: "6tdFVlnQkJmMMTk7DjT6Rs",
  },

  // Christian - Hymns
  {
    id: 81,
    title: "How Great the Wisdom and the Love",
    artist: "Irving O'Neill",
    genre: "Christian",
    subCategory: "Hymns",
    spotifyId: "5BhBYmNYcXzX90HkyTKkJW",
  },
  {
    id: 82,
    title: "Come, Ye Children of the Lord",
    artist: "Rob Tomas",
    genre: "Christian",
    subCategory: "Hymns",
    spotifyId: "5nWIi5gUizD9OwcJDFiATK",
  },
  {
    id: 83,
    title: "Open Now Thy Gates of Beauty",
    artist: "Marcus Anderson",
    genre: "Christian",
    subCategory: "Hymns",
    spotifyId: "6pNBMZQg2AEhs9TKwg5cXo",
  },
  {
    id: 85,
    title: "The King Shall Come",
    artist: "Rob Tomas",
    genre: "Christian",
    subCategory: "Hymns",
    spotifyId: "7I2T25QIb73dOpsOS5wlTD",
  },
  {
    id: 87,
    title: "On What Has Now Been Sown",
    artist: "Marcus Anderson",
    genre: "Christian",
    subCategory: "Hymns",
    spotifyId: "4Ri9cgpV3GVOlPnNvz586r",
  },
  {
    id: 94,
    title: "Open Now Thy Gates of Beauty",
    artist: "Benedict Keller",
    genre: "Christian",
    subCategory: "Hymns",
    spotifyId: "0tKErzzKvfPaICV650oYg0",
  },
  {
    id: 95,
    title: "Fairest Lord Jesus",
    artist: "Benedict Keller",
    genre: "Christian",
    subCategory: "Hymns",
    spotifyId: "2dLON4l9yCNBfYPgsCE5bX",
  },
  // Christian - Worship
  {
    id: 86,
    title: "We Gather Together",
    artist: "Irving O'Neill",
    genre: "Christian",
    subCategory: "Worship",
    spotifyId: "2fOxb9g5xEuXJerDs8L0aH",
  },
  {
    id: 88,
    title: "Go to dark Gethsemane",
    artist: "William Lee",
    genre: "Christian",
    subCategory: "Worship",
    spotifyId: "6kgPBtGF4Im897c1b0tpgV",
  },
  {
    id: 89,
    title: "Angels From the Realms of Glory",
    artist: "William Lee",
    genre: "Christian",
    subCategory: "Worship",
    spotifyId: "1Xlry7gJ4rMjukwEI2IzCx",
  },
  // Christian - Peaceful
  {
    id: 84,
    title: "Where Can I Turn for Peace",
    artist: "William Lee",
    genre: "Christian",
    subCategory: "Peaceful",
    spotifyId: "6wG8qBJcy0jUCcFlpZs4dm",
  },
  {
    id: 90,
    title: "'Tis So Sweet to Trust in Jesus",
    artist: "Carousel of Clouds",
    genre: "Christian",
    subCategory: "Peaceful",
    spotifyId: "1oobqZssMClZTrnBpjaJQ2",
  },
  {
    id: 91,
    title: "He Keeps Me Singing",
    artist: "Carousel of Clouds",
    genre: "Christian",
    subCategory: "Peaceful",
    spotifyId: "6PTW5RtBX4KRAh0KSNhqPQ",
  },
  {
    id: 92,
    title: "Simple Gifts",
    artist: "Carousel of Clouds",
    genre: "Christian",
    subCategory: "Peaceful",
    spotifyId: "1ZZgMbMwPDJoSkz7nULXZw",
  },
  {
    id: 93,
    title: "O Lord I Am Not Worthy",
    artist: "Charles Poole",
    genre: "Christian",
    subCategory: "Peaceful",
    spotifyId: "35VB3ZXkoSAs8uktRzcVUW",
  },

  // Ambient - Ethereal
  {
    id: 96,
    title: "haven",
    artist: "isīma",
    genre: "Ambient",
    subCategory: "Ethereal",
    spotifyId: "2jWn1bjTTyg1u19CUnMIwC",
  },
  {
    id: 99,
    title: "Ashen Light",
    artist: "isīma",
    genre: "Ambient",
    subCategory: "Ethereal",
    spotifyId: "4CE0Irv0sZBeU9z5e9B98v",
  },
  {
    id: 101,
    title: "Heavenly",
    artist: "āya",
    genre: "Ambient",
    subCategory: "Ethereal",
    spotifyId: "3XYkzaXuWCzArRc80UHp26",
  },
  {
    id: 103,
    title: "Through the Overcast",
    artist: "isīma",
    genre: "Ambient",
    subCategory: "Ethereal",
    spotifyId: "7qfZshg0vgKW2iduxrek6P",
  },
  {
    id: 110,
    title: "Somnora",
    artist: "ẹmi",
    genre: "Ambient",
    subCategory: "Ethereal",
    spotifyId: "5wiNVXnW8DSSAZqAeJhZyp",
  },
  {
    id: 111,
    title: "Fae",
    artist: "ẹmi",
    genre: "Ambient",
    subCategory: "Ethereal",
    spotifyId: "7LbtHaHtW5gR53Vhlu6apv",
  },
  {
    id: 114,
    title: "daystar",
    artist: "ṣolạnạ",
    genre: "Ambient",
    subCategory: "Ethereal",
    spotifyId: "0mYrLCdXrwXHg75vQIJEzP",
  },
  {
    id: 115,
    title: "solandria",
    artist: "ṣolạnạ",
    genre: "Ambient",
    subCategory: "Ethereal",
    spotifyId: "2a36WEbtTrbJSeLr0Cq4ez",
  },
  {
    id: 116,
    title: "Perceive",
    artist: "Veloura",
    genre: "Ambient",
    subCategory: "Ethereal",
    spotifyId: "5vIDogf5gW9Vma5TboRLrl",
  },
  // Ambient - Dark
  {
    id: 100,
    title: "The Dark Cloud",
    artist: "beau",
    genre: "Ambient",
    subCategory: "Dark",
    spotifyId: "6l1GY6kudCtkfbZCYkdyNp",
  },
  {
    id: 106,
    title: "Noctilucent Clouds",
    artist: "SKEN",
    genre: "Ambient",
    subCategory: "Dark",
    spotifyId: "2Fcun7FZ4vH3kBPbdtw6uZ",
  },
  {
    id: 107,
    title: "Astray",
    artist: "SKEN",
    genre: "Ambient",
    subCategory: "Dark",
    spotifyId: "1YDn3bachGQc2hZATanMH9",
  },
  {
    id: 112,
    title: "andesine",
    artist: "ìmí",
    genre: "Ambient",
    subCategory: "Dark",
    spotifyId: "4Jnp2IzOPnub6zldNFebDb",
  },
  {
    id: 113,
    title: "oblivisci",
    artist: "ìmí",
    genre: "Ambient",
    subCategory: "Dark",
    spotifyId: "1JpU0Gzyq0TwLvT6J6xlBi",
  },
  {
    id: 117,
    title: "when it all began",
    artist: "Manne Skafvenstedt",
    genre: "Ambient",
    subCategory: "Dark",
    spotifyId: "28qwN7VZ6HsLBFLrcjgZ55",
  },
  {
    id: 118,
    title: "a glimpse",
    artist: "Manne Skafvenstedt",
    genre: "Ambient",
    subCategory: "Dark",
    spotifyId: "1e86VCeYPLoAOQkRCekM6P",
  },
  {
    id: 119,
    title: "memories",
    artist: "Manne Skafvenstedt",
    genre: "Ambient",
    subCategory: "Dark",
    spotifyId: "5yC861NtYR3FbsW68RaNoG",
  },
  {
    id: 120,
    title: "from afar",
    artist: "Manne Skafvenstedt",
    genre: "Ambient",
    subCategory: "Dark",
    spotifyId: "4TwC3J4YK2dsvLOn2FP9bu",
  },
  {
    id: 121,
    title: "reborn",
    artist: "Manne Skafvenstedt",
    genre: "Ambient",
    subCategory: "Dark",
    spotifyId: "0EvTlvwxOZqgw1EjzoaUIL",
  },
  {
    id: 122,
    title: "as dark light",
    artist: "Manne Skafvenstedt",
    genre: "Ambient",
    subCategory: "Dark",
    spotifyId: "0EsBHib2hr52KHnvWlyLkh",
  },
  {
    id: 123,
    title: "i will dissolve",
    artist: "Manne Skafvenstedt",
    genre: "Ambient",
    subCategory: "Dark",
    spotifyId: "6mljVwXsdsYHUZCIF10Cfe",
  },
  {
    id: 124,
    title: "bellum",
    artist: "Manne Skafvenstedt",
    genre: "Ambient",
    subCategory: "Dark",
    spotifyId: "4LHkLQP3Y9bycpFfG5v8Il",
  },
  {
    id: 125,
    title: "inebrantia",
    artist: "Manne Skafvenstedt",
    genre: "Ambient",
    subCategory: "Dark",
    spotifyId: "1LUVPqG1WyeK0fsihIV4lm",
  },
  // Ambient - Nature
  {
    id: 97,
    title: "oceana",
    artist: "beau",
    genre: "Ambient",
    subCategory: "Nature",
    spotifyId: "28D9je9qOTnskQhseqEpza",
  },
  {
    id: 98,
    title: "willow tree",
    artist: "āya",
    genre: "Ambient",
    subCategory: "Nature",
    spotifyId: "6XGeHLUoa4rhBG5SYzEs7u",
  },
  {
    id: 102,
    title: "A lover of rain",
    artist: "ispirà",
    genre: "Ambient",
    subCategory: "Nature",
    spotifyId: "0t8MQl6lV7fivPHmVnTKZv",
  },
  {
    id: 104,
    title: "Daybreak",
    artist: "beau",
    genre: "Ambient",
    subCategory: "Nature",
    spotifyId: "4woeyzEkJsJ1gez65M5gLg",
  },
  {
    id: 105,
    title: "Cloudburst",
    artist: "āya",
    genre: "Ambient",
    subCategory: "Nature",
    spotifyId: "6h9As9ievPbtl28LIyXxat",
  },
  {
    id: 108,
    title: "Estimate",
    artist: "ispíritu",
    genre: "Ambient",
    subCategory: "Nature",
    spotifyId: "7lm8gkHUvNKXmVX857S2KU",
  },
  {
    id: 109,
    title: "Doranel",
    artist: "ispíritu",
    genre: "Ambient",
    subCategory: "Nature",
    spotifyId: "4oh4PhqhD5RXqDytBqyviM",
  },

  // LoFi - Chill
  {
    id: 126,
    title: "nightvibez",
    artist: "léas solais",
    genre: "LoFi",
    subCategory: "Chill",
    spotifyId: "1SLlIviQNwOqyJ5pPMZ0pn",
  },
  {
    id: 129,
    title: "for real",
    artist: "léas solais",
    genre: "LoFi",
    subCategory: "Chill",
    spotifyId: "6AOtzmzFJ3IhsqN2407Hpo",
  },
  {
    id: 133,
    title: "vintara",
    artist: "léas solais",
    genre: "LoFi",
    subCategory: "Chill",
    spotifyId: "6iDN4e3RQQBXi4vn7k3V2M",
  },
  // LoFi - Study
  {
    id: 127,
    title: "unwind rewind",
    artist: "Mambojambo",
    genre: "LoFi",
    subCategory: "Study",
    spotifyId: "2het2Gw9kQZKOZl2ATnog3",
  },
  {
    id: 130,
    title: "Reboot",
    artist: "Mambojambo",
    genre: "LoFi",
    subCategory: "Study",
    spotifyId: "74ShLjHTOr2HEnFwSBPQZ2",
  },
  {
    id: 132,
    title: "food for thought",
    artist: "Mambojambo",
    genre: "LoFi",
    subCategory: "Study",
    spotifyId: "503sUNMLxKorWDZDS823ft",
  },
  // LoFi - Night
  {
    id: 128,
    title: "memory",
    artist: "Nebu",
    genre: "LoFi",
    subCategory: "Night",
    spotifyId: "4gMy8CXhwcaC9ThiZR1eHo",
  },
  {
    id: 131,
    title: "embrace",
    artist: "Nebu",
    genre: "LoFi",
    subCategory: "Night",
    spotifyId: "7h3JilWZMYkOkc5y8OnBvn",
  },
  {
    id: 134,
    title: "sonodex",
    artist: "léas solais",
    genre: "LoFi",
    subCategory: "Night",
    spotifyId: "3q78jRuBitgRPextx7lIIU",
  },

  // Phonk - Sped Up
  {
    id: 135,
    title: "UUM PA UUM PA - SPED UP",
    artist: "M3TAMORPH",
    genre: "Phonk",
    subCategory: "Sped Up",
    spotifyId: "3PyEMQhlWbqn47fG24lS3D",
  },
  {
    id: 136,
    title: "PULSO - SPED UP",
    artist: "M3TAMORPH",
    genre: "Phonk",
    subCategory: "Sped Up",
    spotifyId: "7BLCqCZFd9MsXhMP1lOxrp",
  },
  {
    id: 138,
    title: "Big Back Blesser - SPED UP",
    artist: "M3TAMORPH",
    genre: "Phonk",
    subCategory: "Sped Up",
    spotifyId: "6pA6oCnQtazmXXt9Ek53Vr",
  },
  // Phonk - Hard
  {
    id: 137,
    title: "Malditas",
    artist: "M3TAMORPH",
    genre: "Phonk",
    subCategory: "Hard",
    spotifyId: "7igJ8aFOXsSBxY8kSVlihW",
  },
  {
    id: 139,
    title: "Avada Kedavra",
    artist: "M3TAMORPH",
    genre: "Phonk",
    subCategory: "Hard",
    spotifyId: "0rkZSeUtcXliWF1bZjXPPD",
  },
  // Phonk - Drift
  {
    id: 140,
    title: "FINNA FINNA FINNA",
    artist: "DJ BINKS",
    genre: "Phonk",
    subCategory: "Drift",
    spotifyId: "6Eykhf6fdAmOLjkSy9d5i2",
  },
];

const MusicPlayer = () => {
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);

  const { ref: headerRef, isRevealed: headerRevealed } = useScrollReveal();
  const { ref: genreRef, isRevealed: genreRevealed } = useScrollReveal();
  const { ref: tracksRef, isRevealed: tracksRevealed } = useScrollReveal();
  const { ref: playerRef, isRevealed: playerRevealed } = useScrollReveal();

  // Get available sub-categories for current genre
  const availableSubCategories = selectedGenre !== "All" ? subCategories[selectedGenre] || [] : [];

  // Filter tracks by genre and sub-category
  const filteredTracks = tracks.filter((track) => {
    if (selectedGenre !== "All" && track.genre !== selectedGenre) return false;
    if (selectedSubCategory && track.subCategory !== selectedSubCategory) return false;
    return true;
  });

  const handleGenreSelect = (genre: string) => {
    setSelectedGenre(genre);
    setSelectedSubCategory(null); // Reset sub-category when genre changes
  };

  const handleTrackSelect = (track: Track) => {
    setCurrentTrack(track);
  };

  return (
    <section id="music" className="min-h-screen section-padding bg-card">
      <div className="max-w-5xl mx-auto">
        <div ref={headerRef} className={`scroll-reveal text-center ${headerRevealed ? "revealed" : ""}`}>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-4">Listen</h2>
          <p className="text-muted-foreground text-lg mb-12 md:mb-16">Select a mood. Press play.</p>
        </div>

        {/* Genre Selector */}
        <div
          ref={genreRef}
          className={`flex flex-wrap justify-center gap-2 md:gap-4 mb-6 scroll-reveal scroll-reveal-delay-1 ${genreRevealed ? "revealed" : ""}`}
        >
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => handleGenreSelect(genre)}
              className={`genre-button ${selectedGenre === genre ? "genre-button-active" : "genre-button-inactive"}`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Sub-Category Selector - Only show when a genre is selected */}
        {availableSubCategories.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-12 md:mb-16">
            <button
              onClick={() => setSelectedSubCategory(null)}
              className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 ${
                selectedSubCategory === null
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All {selectedGenre}
            </button>
            {availableSubCategories.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubCategory(sub)}
                className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 ${
                  selectedSubCategory === sub
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* Spacer when no sub-categories */}
        {availableSubCategories.length === 0 && <div className="mb-6 md:mb-10" />}

        {/* Track List */}
        <div
          ref={tracksRef}
          className={`max-h-[360px] overflow-y-auto mb-12 md:mb-16 scroll-reveal scroll-reveal-delay-2 ${tracksRevealed ? "revealed" : ""}`}
        >
          <div className="space-y-1">
            {filteredTracks.map((track, index) => (
              <div
                key={track.id}
                onClick={() => handleTrackSelect(track)}
                className={`group flex items-center justify-between py-4 px-4 cursor-pointer transition-all duration-300 hover:bg-accent ${
                  currentTrack?.id === track.id ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-center gap-6">
                  <span className="text-muted-foreground text-sm w-6">
                    {currentTrack?.id === track.id ? (
                      <span className="inline-block w-2 h-2 bg-foreground rounded-full animate-pulse-slow" />
                    ) : (
                      String(index + 1).padStart(2, "0")
                    )}
                  </span>
                  <div>
                    <p className="font-medium">{track.title}</p>
                    <p className="text-sm text-muted-foreground">{track.artist}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  {track.subCategory}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Spotify Embed Player */}
        <div
          ref={playerRef}
          className={`border-t border-border pt-8 scroll-reveal scroll-reveal-delay-3 ${playerRevealed ? "revealed" : ""}`}
        >
          {currentTrack ? (
            <iframe
              key={currentTrack.spotifyId}
              src={`https://open.spotify.com/embed/track/${currentTrack.spotifyId}?utm_source=generator&theme=0`}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="eager"
              className="rounded-xl"
            />
          ) : (
            <p className="text-muted-foreground text-center py-8">Select a track to play</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default MusicPlayer;
