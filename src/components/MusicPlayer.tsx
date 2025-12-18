import { useState } from "react";
import useScrollReveal from "@/hooks/useScrollReveal";

interface Track {
  id: number;
  title: string;
  artist: string;
  genre: string;
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

const tracks: Track[] = [
  { id: 1, title: "Ponceau", artist: "Ray Love", genre: "Piano", spotifyId: "1qCrvHUu3jt5oSpvYaVrwH" },
  { id: 2, title: "estiu", artist: "Valentine Summers", genre: "Piano", spotifyId: "1vzwRWE2Vj7JZwqBqi9ivM" },
  { id: 3, title: "Juliet Rose", artist: "A Little Time", genre: "Piano", spotifyId: "5eiXYdSRFd48jBqnQrw83h" },
  { id: 4, title: "Echidna", artist: "Northern Dreams", genre: "Piano", spotifyId: "66IOe8PcQPacJ3D3MtGLMS" },
  { id: 5, title: "sēnse", artist: "ispirà", genre: "Piano", spotifyId: "7xAEN2uqrL8MGnpuyAbrmd" },
  { id: 6, title: "From a Distance", artist: "Mindy Thurma", genre: "Piano", spotifyId: "7DSAwNkmall9lAltVsoWFw" },
  { id: 7, title: "The Years Grew Quiet", artist: "Giorgio Rossi", genre: "Piano", spotifyId: "5TjMmdE5zIWUrFhBqL9Lge" },
  { id: 8, title: "Ember", artist: "Lunar Lull", genre: "Piano", spotifyId: "7yZcjQGSDcKdxAmxJ7rvqd" },
  { id: 9, title: "Jade Vine", artist: "Moonsong", genre: "Piano", spotifyId: "6rr10DYH1fRl2r1JATikzT" },
  { id: 10, title: "Between Heartbeats", artist: "Cassian Lake", genre: "Piano", spotifyId: "4WxEAxB8e317cYBRwz9NaO" },
  { id: 11, title: "Ashlight", artist: "Runā Væra", genre: "Piano", spotifyId: "0opEMDtj6BWB0zitXoJx5d" },
  { id: 12, title: "Messy", artist: "Runā Væra", genre: "Piano", spotifyId: "4fK6LMhdx6DCFO4ShQsvI3" },
  { id: 13, title: "Still Crazy After All These Years", artist: "Runā Væra", genre: "Piano", spotifyId: "5nC0JYo9VuvDMBzMlgVAvY" },
  { id: 14, title: "I Love Every Little Thing About You", artist: "Runā Væra", genre: "Piano", spotifyId: "4m78bGAE8y27nVVvo88L5M" },
  { id: 15, title: "Iris", artist: "Allena", genre: "Piano", spotifyId: "4ZXTjnWKgkJdcOu41Izs7d" },
  { id: 16, title: "Beautiful Things", artist: "Esther & John", genre: "Acoustic Cover", spotifyId: "6nnNpzVfOVfYcTlAwNnTzU" },
  { id: 17, title: "Man I Need", artist: "Esther & John", genre: "Acoustic Cover", spotifyId: "6UuKo0mzNdThLwt1DlobiP" },
  { id: 18, title: "feelslikeimfallinginlove", artist: "Esther & John", genre: "Acoustic Cover", spotifyId: "2x60ePnBzW1db4JOyxBW6u" },
  { id: 19, title: "Birds of a Feather", artist: "Gustav & Julia", genre: "Acoustic Cover", spotifyId: "6Mcwnd9E7rhABPZUPZpxCX" },
  { id: 20, title: "Kiss - Acoustic Version", artist: "Gustav & Julia", genre: "Acoustic Cover", spotifyId: "0J9liajekfS7m5egdYmmbD" },
  { id: 21, title: "Blue Haze", artist: "Ray Love Trio", genre: "Jazz", spotifyId: "1s1l7ksPaqruuvc4LdCH6f" },
  { id: 22, title: "Serevine", artist: "A Whisper", genre: "Piano", spotifyId: "1U7fnO16fpCkir1Z8RDdt3" },
  { id: 23, title: "Evening Sun", artist: "Alec Taylor Trio", genre: "Jazz", spotifyId: "5Kwzs76HmFATFfdAHEN1tw" },
  { id: 24, title: "The Quiet Storm", artist: "Andy Luma Trio", genre: "Jazz", spotifyId: "5caSbCpxmMVfAdq6wt37nF" },
  { id: 25, title: "The Things We Did Last Summer", artist: "Einar Magnusson", genre: "Jazz", spotifyId: "2kZE2oq2A6IdoXFxNEVQwV" },
  { id: 26, title: "A Wayfarer's Tale", artist: "Ray Love Trio", genre: "Jazz", spotifyId: "0RrvMxwdAX6qBQHjR3EEPZ" },
  { id: 27, title: "Midnight Drift", artist: "Urskogen Jazz", genre: "Jazz", spotifyId: "6UjkXOZj0kZB3XTJrGxoIS" },
  { id: 28, title: "Another Time", artist: "Northern Dreams", genre: "Piano", spotifyId: "7lk8jlre48y3teEbgRvrMT" },
  { id: 29, title: "This Time Tomorrow", artist: "Helmut Cole Trio", genre: "Jazz", spotifyId: "7s8J2SLXguqAT8RqoqSXoh" },
  { id: 30, title: "Flamingo", artist: "Ray Love", genre: "Jazz", spotifyId: "5hUBEW72nvmwnibrFUFemr" },
  { id: 31, title: "For Sentimental Reasons", artist: "Ray Love Trio", genre: "Jazz", spotifyId: "16XLUnjRsRJ2ZAUTsxCH1D" },
  { id: 32, title: "Spring Green", artist: "Einar Magnusson", genre: "Jazz", spotifyId: "0Yn1xmq6NE9XWeUBnPGyb6" },
  { id: 33, title: "Silver Starling", artist: "Maurillo", genre: "Piano", spotifyId: "5rwMEeR0gsn2pivUE2R99J" },
  { id: 34, title: "O Sol e Você", artist: "Douglas Ruby Trio", genre: "Jazz", spotifyId: "4vNwnJae8o9CEB2FMriGCa" },
  { id: 35, title: "In the Arms of the Moon", artist: "Irvin Smith Group", genre: "Jazz", spotifyId: "1IyTd7bacOtYouAi2LSknM" },
  { id: 36, title: "A Última Canção", artist: "Karl-Erik Trio", genre: "Jazz", spotifyId: "5mGMnKiVkI4QQAnlfZBGWh" },
  { id: 37, title: "Noite de Luzes Perdidas", artist: "Alec Taylor Trio", genre: "Jazz", spotifyId: "3dA9qQ6WTCCKbFcrlzV3gI" },
  { id: 38, title: "In Every Gaze", artist: "Isac Solo Trio", genre: "Jazz", spotifyId: "0okadaNpxIXbYtMOMoIg9Z" },
  { id: 39, title: "Star Rain", artist: "Ray Love Trio", genre: "Jazz", spotifyId: "1H2mfBUP4SJ8rXoYp7Ylpy" },
  { id: 40, title: "Rastro de Luz", artist: "Kristian Hart Trio", genre: "Jazz", spotifyId: "4owVHaczMrY21ppWgasyx7" },
  { id: 41, title: "Christmas Is Coming", artist: "Isac Solo Trio", genre: "Christmas", spotifyId: "149nYuNSxKF3rPGpReOjtv" },
  { id: 42, title: "Christmas Serenade", artist: "Eternal Time Trio", genre: "Christmas", spotifyId: "4Jd9637OEC5AtH3JEXqS16" },
  { id: 43, title: "The Snowman's Song", artist: "Irvin Smith Group", genre: "Christmas", spotifyId: "3J8ksIbjusqpBOiIIR126Y" },
  { id: 44, title: "Let's Go for a Sleigh Ride", artist: "Douglas Ruby Trio", genre: "Christmas", spotifyId: "47R5PBxbTYYFJlOlDKE4Pa" },
  { id: 45, title: "The Lights of Christmas", artist: "Kristian Hart Trio", genre: "Christmas", spotifyId: "47MoUrhCysfTKpsgoMR6Tm" },
  { id: 46, title: "The Gift (By the Fireplace)", artist: "Alec Taylor", genre: "Christmas", spotifyId: "0u9SdMGpKcEWiCKJmo6FaI" },
  { id: 47, title: "The Gift", artist: "Ray Love Trio", genre: "Christmas", spotifyId: "1aQdyHGM4yBgzJQAvAK1c9" },
  { id: 48, title: "Silver and Gold", artist: "Irvin Smith Group", genre: "Christmas", spotifyId: "0AwwVWuQqlDnNKigbSgxzK" },
  { id: 49, title: "Go Tell It on the Mountain", artist: "Karl-Erik Trio", genre: "Christmas", spotifyId: "0DX11hT4Ff6ST0WeaNHbta" },
  { id: 50, title: "O Come, All Ye Faithful", artist: "Antonia Woodhouse", genre: "Christmas", spotifyId: "4IBNav8NPSTK7sMjfhcCOE" },
  { id: 51, title: "When You Wish Upon a Star", artist: "Damien May", genre: "Christmas", spotifyId: "4h7Kp6xwI446WeM0VUBUzC" },
  { id: 52, title: "Auld Lang Syne", artist: "Noa Figaro", genre: "Christmas", spotifyId: "2GAk05oJ7yvQ4gpZ1Y6cRQ" },
  { id: 53, title: "O Holy Night", artist: "Allena", genre: "Christmas", spotifyId: "2yg9O6lrukgGWUks9gInhD" },
  { id: 54, title: "It's Beginning to Look a Lot Like Christmas", artist: "Rob Tomas", genre: "Christmas", spotifyId: "1VPmQMIY3Yjtaz6Bnzwqxh" },
  { id: 55, title: "Blue Christmas", artist: "Irving O'Neill", genre: "Christmas", spotifyId: "0GtHRKHzS40gITCF8EiUAF" },
  { id: 56, title: "Etude No. 5 - Felt Piano Version", artist: "Philip Glass, Johan Kwan", genre: "Classical", spotifyId: "7lR3Nl9YNqGs7MZDH9fNd5" },
  { id: 57, title: "Elegy for the Arctic", artist: "Isabella Söderberg", genre: "Classical", spotifyId: "3GwOQwoOnQdfnjNVKCwjxW" },
  { id: 58, title: "Glassworks: I. Opening - Felt Piano", artist: "Johan Kwan", genre: "Classical", spotifyId: "0Wqz4sZjzNW9fnaCIKHQiL" },
  { id: 59, title: "Metamorphosis One", artist: "Johan Kwan", genre: "Classical", spotifyId: "3Cid9c0axfr4B9ODMdpOzE" },
  { id: 60, title: "Truman Sleeps", artist: "Isabella Söderberg", genre: "Classical", spotifyId: "03lcDAQZdtgqzGJamAxtHI" },
  { id: 61, title: "Glassworks: Opening", artist: "Johan Kwan", genre: "Classical", spotifyId: "0DwYvpDam6dZhiJq4vaQxJ" },
  { id: 62, title: "3 Gymnopédies: No. 1 - Cello Version", artist: "Erik Satie, Isabella Söderberg", genre: "Classical", spotifyId: "7MpOoMpD2zt6dJ1PlasE0e" },
  { id: 63, title: "Etude No. 5", artist: "Philip Glass, Johan Kwan", genre: "Classical", spotifyId: "4N0aK2Z7qjkBKDq24C1s0i" },
  { id: 64, title: "Yawning", artist: "Rosa Kindstrand", genre: "Lullabies", spotifyId: "1sQx9bypnw0LOHkqpORqxO" },
  { id: 65, title: "Little Heart", artist: "Månljus", genre: "Lullabies", spotifyId: "3DzkAjFXZVd9Sk6KBFpcss" },
  { id: 66, title: "My Friend is Mine", artist: "Goodnight sweetheart", genre: "Lullabies", spotifyId: "5yYMMdbChJzV8zCsG623qB" },
  { id: 67, title: "Twinklepaws", artist: "Goodnight sweetheart", genre: "Lullabies", spotifyId: "7DxNaPj5FZrMrScOmYAdvp" },
  { id: 68, title: "Angel Eyes", artist: "Goodnight sweetheart", genre: "Lullabies", spotifyId: "1pYhOdETtHjHywmp2jNCaS" },
  { id: 69, title: "Best Friends", artist: "Goodnight sweetheart", genre: "Lullabies", spotifyId: "2wwpOSNHJKPw8SUyqpq0gl" },
  { id: 70, title: "Flower Petals", artist: "Lantern", genre: "Lullabies", spotifyId: "1YGY4AeXwNARWJ1iYyddRi" },
  { id: 71, title: "Snowdrop", artist: "Douglas Ruby", genre: "Lullabies", spotifyId: "36qNynUmExvLMosT826GIJ" },
  { id: 72, title: "Flufftail", artist: "The Stories We Tell", genre: "Lullabies", spotifyId: "6jer7vbiRBAlFfphQd3cE9" },
  { id: 73, title: "Gigglepaws", artist: "The Stories We Tell", genre: "Lullabies", spotifyId: "0OKnujtaEPOi8KIR7zpQo2" },
  { id: 74, title: "Little Farmboy", artist: "Maurillo", genre: "Lullabies", spotifyId: "707SGKBJOKGZtEUayuXoFp" },
  { id: 75, title: "Hush Now Little Lamb", artist: "Holy Day", genre: "Lullabies", spotifyId: "2QhKyPInwRf0gqjWiu4VVm" },
  { id: 76, title: "Sleepy Snowflake", artist: "Noel Keys", genre: "Lullabies", spotifyId: "6tdFVlnQkJmMMTk7DjT6Rs" },
  { id: 77, title: "Beetle", artist: "Rosa Kindstrand", genre: "Lullabies", spotifyId: "71M4sox6ulygaWTksIAlyG" },
  { id: 78, title: "Man I Need", artist: "Irving O'Neill", genre: "Acoustic Cover", spotifyId: "37CfzvKVcteIFeNXfocxvG" },
  { id: 79, title: "Birds of a Feather", artist: "The Happy Cat", genre: "Acoustic Cover", spotifyId: "6xH9KARVKHPKlYYXpYDVni" },
  { id: 80, title: "Beautiful Things", artist: "Wonder Wave", genre: "Acoustic Cover", spotifyId: "4Uv8fcqdKavS1tcH5rIXKg" },
  { id: 81, title: "How Great the Wisdom and the Love", artist: "Irving O'Neill", genre: "Christian", spotifyId: "5BhBYmNYcXzX90HkyTKkJW" },
  { id: 82, title: "Come, Ye Children of the Lord", artist: "Rob Tomas", genre: "Christian", spotifyId: "5nWIi5gUizD9OwcJDFiATK" },
  { id: 83, title: "Open Now Thy Gates of Beauty", artist: "Marcus Anderson", genre: "Christian", spotifyId: "6pNBMZQg2AEhs9TKwg5cXo" },
  { id: 84, title: "Where Can I Turn for Peace", artist: "William Lee", genre: "Christian", spotifyId: "6wG8qBJcy0jUCcFlpZs4dm" },
  { id: 85, title: "The King Shall Come", artist: "Rob Tomas", genre: "Christian", spotifyId: "7I2T25QIb73dOpsOS5wlTD" },
  { id: 86, title: "We Gather Together", artist: "Irving O'Neill", genre: "Christian", spotifyId: "2fOxb9g5xEuXJerDs8L0aH" },
  { id: 87, title: "On What Has Now Been Sown", artist: "Marcus Anderson", genre: "Christian", spotifyId: "4Ri9cgpV3GVOlPnNvz586r" },
  { id: 88, title: "Go to dark Gethsemane", artist: "William Lee", genre: "Christian", spotifyId: "6kgPBtGF4Im897c1b0tpgV" },
  { id: 89, title: "Angels From the Realms of Glory", artist: "William Lee", genre: "Christian", spotifyId: "1Xlry7gJ4rMjukwEI2IzCx" },
  { id: 90, title: "'Tis So Sweet to Trust in Jesus", artist: "Carousel of Clouds", genre: "Christian", spotifyId: "1oobqZssMClZTrnBpjaJQ2" },
  { id: 91, title: "He Keeps Me Singing", artist: "Carousel of Clouds", genre: "Christian", spotifyId: "6PTW5RtBX4KRAh0KSNhqPQ" },
  { id: 92, title: "Simple Gifts", artist: "Carousel of Clouds", genre: "Christian", spotifyId: "1ZZgMbMwPDJoSkz7nULXZw" },
  { id: 93, title: "O Lord I Am Not Worthy", artist: "Charles Poole", genre: "Christian", spotifyId: "35VB3ZXkoSAs8uktRzcVUW" },
  { id: 94, title: "Open Now Thy Gates of Beauty", artist: "Benedict Keller", genre: "Christian", spotifyId: "0tKErzzKvfPaICV650oYg0" },
  { id: 95, title: "Fairest Lord Jesus", artist: "Benedict Keller", genre: "Christian", spotifyId: "2dLON4l9yCNBfYPgsCE5bX" },
  { id: 96, title: "haven", artist: "isīma", genre: "Ambient", spotifyId: "2jWn1bjTTyg1u19CUnMIwC" },
  { id: 97, title: "oceana", artist: "beau", genre: "Ambient", spotifyId: "28D9je9qOTnskQhseqEpza" },
  { id: 98, title: "willow tree", artist: "āya", genre: "Ambient", spotifyId: "6XGeHLUoa4rhBG5SYzEs7u" },
  { id: 99, title: "Ashen Light", artist: "isīma", genre: "Ambient", spotifyId: "4CE0Irv0sZBeU9z5e9B98v" },
  { id: 100, title: "The Dark Cloud", artist: "beau", genre: "Ambient", spotifyId: "6l1GY6kudCtkfbZCYkdyNp" },
  { id: 101, title: "Heavenly", artist: "āya", genre: "Ambient", spotifyId: "3XYkzaXuWCzArRc80UHp26" },
  { id: 102, title: "A lover of rain", artist: "ispirà", genre: "Ambient", spotifyId: "0t8MQl6lV7fivPHmVnTKZv" },
  { id: 103, title: "Through the Overcast", artist: "isīma", genre: "Ambient", spotifyId: "7qfZshg0vgKW2iduxrek6P" },
  { id: 104, title: "Daybreak", artist: "beau", genre: "Ambient", spotifyId: "4woeyzEkJsJ1gez65M5gLg" },
  { id: 105, title: "Cloudburst", artist: "āya", genre: "Ambient", spotifyId: "6h9As9ievPbtl28LIyXxat" },
  { id: 106, title: "Noctilucent Clouds", artist: "SKEN", genre: "Ambient", spotifyId: "2Fcun7FZ4vH3kBPbdtw6uZ" },
  { id: 107, title: "Astray", artist: "SKEN", genre: "Ambient", spotifyId: "1YDn3bachGQc2hZATanMH9" },
  { id: 108, title: "Estimate", artist: "ispíritu", genre: "Ambient", spotifyId: "7lm8gkHUvNKXmVX857S2KU" },
  { id: 109, title: "Doranel", artist: "ispíritu", genre: "Ambient", spotifyId: "4oh4PhqhD5RXqDytBqyviM" },
  { id: 110, title: "Somnora", artist: "ẹmi", genre: "Ambient", spotifyId: "5wiNVXnW8DSSAZqAeJhZyp" },
  { id: 111, title: "Fae", artist: "ẹmi", genre: "Ambient", spotifyId: "7LbtHaHtW5gR53Vhlu6apv" },
  { id: 112, title: "andesine", artist: "ìmí", genre: "Ambient", spotifyId: "4Jnp2IzOPnub6zldNFebDb" },
  { id: 113, title: "oblivisci", artist: "ìmí", genre: "Ambient", spotifyId: "1JpU0Gzyq0TwLvT6J6xlBi" },
  { id: 114, title: "daystar", artist: "ṣolạnạ", genre: "Ambient", spotifyId: "0mYrLCdXrwXHg75vQIJEzP" },
  { id: 115, title: "solandria", artist: "ṣolạnạ", genre: "Ambient", spotifyId: "2a36WEbtTrbJSeLr0Cq4ez" },
  { id: 116, title: "Perceive", artist: "Veloura", genre: "Ambient", spotifyId: "5vIDogf5gW9Vma5TboRLrl" },
  { id: 117, title: "when it all began", artist: "Manne Skafvenstedt", genre: "Ambient", spotifyId: "28qwN7VZ6HsLBFLrcjgZ55" },
  { id: 118, title: "a glimpse", artist: "Manne Skafvenstedt", genre: "Ambient", spotifyId: "1e86VCeYPLoAOQkRCekM6P" },
  { id: 119, title: "memories", artist: "Manne Skafvenstedt", genre: "Ambient", spotifyId: "5yC861NtYR3FbsW68RaNoG" },
  { id: 120, title: "from afar", artist: "Manne Skafvenstedt", genre: "Ambient", spotifyId: "4TwC3J4YK2dsvLOn2FP9bu" },
  { id: 121, title: "reborn", artist: "Manne Skafvenstedt", genre: "Ambient", spotifyId: "0EvTlvwxOZqgw1EjzoaUIL" },
  { id: 122, title: "as dark light", artist: "Manne Skafvenstedt", genre: "Ambient", spotifyId: "0EsBHib2hr52KHnvWlyLkh" },
  { id: 123, title: "i will dissolve", artist: "Manne Skafvenstedt", genre: "Ambient", spotifyId: "6mljVwXsdsYHUZCIF10Cfe" },
  { id: 124, title: "bellum", artist: "Manne Skafvenstedt", genre: "Ambient", spotifyId: "4LHkLQP3Y9bycpFfG5v8Il" },
  { id: 125, title: "inebrantia", artist: "Manne Skafvenstedt", genre: "Ambient", spotifyId: "1LUVPqG1WyeK0fsihIV4lm" },
  { id: 126, title: "nightvibez", artist: "léas solais", genre: "LoFi", spotifyId: "1SLlIviQNwOqyJ5pPMZ0pn" },
  { id: 127, title: "unwind rewind", artist: "Mambojambo", genre: "LoFi", spotifyId: "2het2Gw9kQZKOZl2ATnog3" },
  { id: 128, title: "memory", artist: "Nebu", genre: "LoFi", spotifyId: "4gMy8CXhwcaC9ThiZR1eHo" },
  { id: 129, title: "for real", artist: "léas solais", genre: "LoFi", spotifyId: "6AOtzmzFJ3IhsqN2407Hpo" },
  { id: 130, title: "Reboot", artist: "Mambojambo", genre: "LoFi", spotifyId: "74ShLjHTOr2HEnFwSBPQZ2" },
  { id: 131, title: "embrace", artist: "Nebu", genre: "LoFi", spotifyId: "7h3JilWZMYkOkc5y8OnBvn" },
  { id: 132, title: "food for thought", artist: "Mambojambo", genre: "LoFi", spotifyId: "503sUNMLxKorWDZDS823ft" },
  { id: 133, title: "vintara", artist: "léas solais", genre: "LoFi", spotifyId: "6iDN4e3RQQBXi4vn7k3V2M" },
  { id: 134, title: "sonodex", artist: "léas solais", genre: "LoFi", spotifyId: "3q78jRuBitgRPextx7lIIU" },
  { id: 135, title: "UUM PA UUM PA - SPED UP", artist: "M3TAMORPH", genre: "Phonk", spotifyId: "3PyEMQhlWbqn47fG24lS3D" },
  { id: 136, title: "PULSO - SPED UP", artist: "M3TAMORPH", genre: "Phonk", spotifyId: "7BLCqCZFd9MsXhMP1lOxrp" },
  { id: 137, title: "Malditas", artist: "M3TAMORPH", genre: "Phonk", spotifyId: "7igJ8aFOXsSBxY8kSVlihW" },
  { id: 138, title: "Big Back Blesser - SPED UP", artist: "M3TAMORPH", genre: "Phonk", spotifyId: "6pA6oCnQtazmXXt9Ek53Vr" },
  { id: 139, title: "Avada Kedavra", artist: "M3TAMORPH", genre: "Phonk", spotifyId: "0rkZSeUtcXliWF1bZjXPPD" },
  { id: 140, title: "FINNA FINNA FINNA", artist: "DJ BINKS", genre: "Phonk", spotifyId: "6Eykhf6fdAmOLjkSy9d5i2" },
];

const MusicPlayer = () => {
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);

  const { ref: headerRef, isRevealed: headerRevealed } = useScrollReveal();
  const { ref: genreRef, isRevealed: genreRevealed } = useScrollReveal();
  const { ref: tracksRef, isRevealed: tracksRevealed } = useScrollReveal();
  const { ref: playerRef, isRevealed: playerRevealed } = useScrollReveal();

  const filteredTracks = selectedGenre === "All" ? tracks : tracks.filter((track) => track.genre === selectedGenre);

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
          className={`flex flex-wrap justify-center gap-2 md:gap-4 mb-12 md:mb-16 scroll-reveal scroll-reveal-delay-1 ${genreRevealed ? "revealed" : ""}`}
        >
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`genre-button ${selectedGenre === genre ? "genre-button-active" : "genre-button-inactive"}`}
            >
              {genre}
            </button>
          ))}
        </div>

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
                  {track.genre}
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
              src={`https://open.spotify.com/embed/track/${currentTrack.spotifyId}?utm_source=generator&theme=0`}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
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
