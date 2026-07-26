import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { Quest } from "../types.ts";

type Seed = Omit<Quest, "id">;

const active: Seed[] = [
  ["The fog line race", "Climb the Vulcan steps before 8 AM and stop exactly where the fog turns into blue sky. Take one photo facing each direction without moving your feet.", "Vulcan Stairway", "Corona Heights", 37.76253, -122.44203, 30, ["early_morning", "foggy"], "pair", 4],
  ["The no-escalator commute", "Start at the bottom of the 16th Avenue steps just after sunrise. Reach the top without pausing, then walk down the parallel street without looking back.", "16th Avenue Tiled Steps", "Inner Sunset", 37.75627, -122.47371, 30, ["early_morning"], "solo", 3],
  ["Three hills, one song", "Pick one song longer than seven minutes and start it at the base of Billy Goat Hill. Reach the rope swing overlook before it ends.", "Billy Goat Hill", "Glen Park", 37.74175, -122.43339, 30, ["golden_hour"], "pair", 4],
  ["The stairway with no street", "Find the Pemberton steps before the neighborhood wakes up. Climb every flight, but turn around only at landings with a view.", "Pemberton Steps", "Twin Peaks", 37.7579, -122.4449, 30, ["early_morning"], "solo", 4],
  ["The concrete slide circuit", "Bring cardboard to the Seward slides on a dry weekday morning. Take exactly three runs, making each one quieter than the last.", "Seward Mini Park", "Castro", 37.75774, -122.44027, 30, ["weekday_morning", "dry"], "pair", 5],
  ["The creek you can almost hear", "Enter Glen Canyon after rain and follow the lowest trail for twenty minutes. Stop wherever traffic disappears and count five separate bird calls.", "Glen Canyon Park", "Glen Park", 37.73908, -122.44274, 60, ["after_rain", "morning"], "solo", 3],
  ["The midnight switchbacks", "Walk the Harry Street steps after 9 PM with one friend. At every landing, trade who leads without saying why.", "Harry Street Steps", "Glen Park", 37.74002, -122.43231, 30, ["night"], "pair", 4],
  ["The wind test", "Cross the Bernal rock labyrinth on the windiest afternoon you can find. Keep one hand in your pocket the entire way.", "Bernal Rock Labyrinth", "Bernal Heights", 37.74472, -122.41347, 30, ["windy", "afternoon"], "solo", 5],
  ["The hidden tennis warm-up", "Reach the little court at Douglass Park before 7 AM. Rally until someone hits the fence, then leave immediately.", "Douglass Playground", "Noe Valley", 37.75459, -122.43897, 60, ["early_morning"], "pair", 3],
  ["The eucalyptus sprint", "Enter Mount Sutro when the fog is thick enough to bead on your sleeves. Power-walk to the summit and do not check the map twice.", "Historic Trail", "Mount Sutro", 37.75882, -122.45781, 60, ["foggy", "morning"], "pair", 4],
  ["The crooked block climb", "Start at the bottom of Vermont Street at blue hour. Walk its curves backward while your friend watches for cars.", "Vermont Street", "Potrero Hill", 37.75793, -122.40363, 15, ["blue_hour"], "pair", 5],
  ["The tide-line dash", "At low tide, walk the narrow strip below Heron's Head as far as dry shoes allow. Race the returning water back to the path.", "Heron's Head Park", "Bayview", 37.73814, -122.37276, 60, ["low_tide"], "group", 4],
  ["The reservoir lap with rules", "Circle the Upper Reservoir at golden hour. Jog the sunny side, walk the shadow side, and switch every time a dog passes.", "McLaren Park Reservoir", "Excelsior", 37.71986, -122.41772, 60, ["golden_hour"], "pair", 3],
  ["The industrial shoreline mile", "Start at Warm Water Cove before the lunch trucks arrive. Walk south until you find three different warning signs, then retrace the route faster.", "Warm Water Cove", "Dogpatch", 37.76045, -122.38699, 60, ["weekday_morning"], "solo", 4],
  ["The dune crossing", "Enter the Presidio dunes just after a windy night. Follow only footprints that are already fading and leave no straight path of your own.", "Presidio Coastal Bluffs", "Presidio", 37.79709, -122.47137, 60, ["early_morning", "windy"], "solo", 4],
  ["The dawn pier count", "Reach Pier 70 before sunrise and walk every public edge you can find. Count cranes, not boats, and turn back at twelve.", "Crane Cove Park", "Dogpatch", 37.75675, -122.38773, 30, ["sunrise"], "pair", 3],
].map(toSeed("active"));

const chill: Seed[] = [
  ["The last bench before dark", "Reach the bench above Tank Hill fifteen minutes before sunset. Sit until the city lights outnumber the people, and keep your phones in your pockets.", "Tank Hill", "Cole Valley", 37.75994, -122.44762, 60, ["golden_hour", "sunset"], "pair", 3],
  ["The library's smallest window", "Go to the Potrero branch during the last hour before closing. Find the seat with the narrowest view and read ten pages of something chosen from the returns cart.", "Potrero Branch Library", "Potrero Hill", 37.75616, -122.40124, 60, ["late_afternoon"], "solo", 4],
  ["The quiet side of the reservoir", "Reach Pine Lake before 9 AM and sit on the side without a path. Stay until you see the same bird land twice.", "Pine Lake", "Parkside", 37.73635, -122.4897, 60, ["early_morning"], "solo", 3],
  ["The greenhouse rain room", "Visit the tiny greenhouse at Alemany Farm while it is raining. Listen from under the awning for ten minutes before stepping inside.", "Alemany Farm", "Bernal Heights", 37.73375, -122.41891, 30, ["raining"], "pair", 4],
  ["The blue-hour bleachers", "Sit on the highest empty bleacher at Palega just after sunset. Each person names one window they think has the best life behind it.", "Palega Recreation Center", "Portola", 37.72869, -122.40945, 30, ["blue_hour"], "group", 4],
  ["The eucalyptus weather report", "Lie beneath the trees at Interior Greenbelt on a foggy afternoon. Decide what the weather sounds like without using any weather words.", "Interior Greenbelt", "Forest Knolls", 37.75831, -122.45925, 30, ["foggy", "afternoon"], "pair", 5],
  ["The empty amphitheater", "Find the stone seats at McLaren's Jerry Garcia Amphitheater before noon on a weekday. Sit in three different rows and choose which one makes silence sound largest.", "Jerry Garcia Amphitheater", "Excelsior", 37.71761, -122.42066, 30, ["weekday_morning"], "solo", 4],
  ["The ferry wake watch", "Stand at India Basin after the afternoon wind starts. Watch five boat wakes arrive without checking which boat made them.", "India Basin Shoreline Park", "Bayview", 37.73393, -122.37874, 30, ["afternoon", "windy"], "pair", 3],
  ["The two-cup thermos", "Bring one thermos to Esprit Park at 7 AM and two cups. Pour both before either person speaks.", "Esprit Park", "Dogpatch", 37.76139, -122.39062, 30, ["early_morning"], "pair", 3],
  ["The garden after closing time", "Reach the gate of the Cayuga playground garden ten minutes before dusk. Walk the outside fence and pick a carved face to remember without photographing it.", "Cayuga Playground", "Outer Mission", 37.71485, -122.45039, 30, ["dusk"], "solo", 5],
  ["The hill that faces away", "Sit on the east slope of Kite Hill at sunset, facing away from downtown. Leave only when the grass stops looking green.", "Kite Hill", "Castro", 37.75613, -122.44173, 30, ["sunset"], "pair", 3],
  ["The laundromat intermission", "Start a wash cycle at a neighborhood laundromat after 8 PM. Spend the whole cycle outside on the nearest bench with no headphones.", "Veterans Wash Center", "Outer Richmond", 37.78104, -122.48731, 60, ["night"], "solo", 4],
  ["The secret picnic table", "Find the single table behind Sunnyside Conservatory on a weekday afternoon. Bring one fruit neither person has eaten this month.", "Sunnyside Conservatory", "Sunnyside", 37.73158, -122.44038, 30, ["weekday_afternoon"], "pair", 4],
  ["The fog bell pause", "Stand near the Fort Mason piers when the foghorns begin. Close your eyes for three signals, then point toward the one that sounded farthest away.", "Fort Mason Piers", "Marina", 37.80671, -122.43158, 30, ["foggy"], "pair", 3],
  ["The after-rain overlook", "Visit Brooks Park within an hour after the rain stops. Sit where the grass is still dry and watch the clouds leave before you do.", "Brooks Park", "Oceanview", 37.70889, -122.46637, 30, ["after_rain"], "solo", 4],
  ["The midnight book exchange", "Take a book you are finished with to a sidewalk library after 10 PM. Leave it, take nothing, and read the handwritten notes inside three others.", "Noe Valley Little Free Library", "Noe Valley", 37.7484, -122.4314, 30, ["night"], "solo", 4],
].map(toSeed("chill"));

const photo: Seed[] = [
  ["The color nobody frames", "Find the most sun-faded door on Balmy Alley after a rainy morning. Photograph only its shadow, then compare it with the door itself.", "Balmy Alley", "Mission", 37.75168, -122.41242, 30, ["after_rain", "morning"], "solo", 4],
  ["Twelve shades of concrete", "Walk the Islais Creek edge at noon, when the light is least flattering. Make a twelve-photo grid using only concrete and water.", "Islais Creek Shoreline", "Bayview", 37.74661, -122.38664, 60, ["midday"], "solo", 4],
  ["The upside-down skyline", "Go to a puddled street in Dogpatch after rain. Photograph the skyline only through reflections and never point the camera above your waist.", "22nd Street Caltrain", "Dogpatch", 37.7576, -122.39253, 30, ["after_rain"], "solo", 4],
  ["The accidental alphabet", "Walk one block of Mission Street before 8 AM. Find five letters made by fire escapes, wires, or shadows. No printed signs allowed.", "Mission Street at 29th", "Bernal Heights", 37.74432, -122.42076, 30, ["early_morning"], "pair", 5],
  ["The orange window", "Reach the Bernal Cut at golden hour. Frame the same passing train through three different gaps in the fence.", "Bernal Cut", "Glen Park", 37.73324, -122.43477, 30, ["golden_hour"], "pair", 4],
  ["The one-color market", "Enter Alemany Market in its final hour. Pick one color and photograph it seven times without capturing a face.", "Alemany Farmers Market", "Bernal Heights", 37.73543, -122.40967, 60, ["market_closing"], "solo", 3],
  ["The shadow staircase", "Reach the Lincoln Park steps when the sun is low. Photograph the stairs without including a single tile. Shadows only.", "Lincoln Park Steps", "Outer Richmond", 37.78344, -122.50171, 30, ["golden_hour"], "solo", 4],
  ["The smallest skyline", "Find a view of downtown through a chain-link opening at Potrero del Sol. Make the whole skyline fit inside one diamond.", "Potrero del Sol", "Mission", 37.74914, -122.40591, 30, ["late_afternoon"], "pair", 4],
  ["The night bus triptych", "Ride the 24 for exactly three stops after 9 PM. At each stop, photograph the same empty seat from a different angle.", "24 Divisadero at Cortland", "Bernal Heights", 37.73887, -122.41606, 30, ["night"], "solo", 5],
  ["The painted utility hunt", "Walk Precita Avenue on a foggy morning and find four utility boxes painted in incompatible styles. Frame them as if they belong together.", "Precita Avenue", "Bernal Heights", 37.747, -122.41273, 30, ["foggy", "morning"], "pair", 4],
  ["The red-light portrait", "Stand beneath the old neon at the 500 Club after dark. Make a portrait using only reflected red light. Keep the sign outside the frame.", "500 Club", "Mission", 37.76319, -122.41968, 15, ["night"], "pair", 3],
  ["The invisible playground", "Visit the hand-built corners of Cayuga just after sunrise. Photograph five carved faces without showing the object each face belongs to.", "Cayuga Playground", "Outer Mission", 37.71485, -122.45039, 60, ["sunrise"], "solo", 5],
  ["The windy still life", "Bring three light objects to Candlestick Point on a windy afternoon. Arrange and photograph them before the wind changes the composition.", "Candlestick Point", "Bayview", 37.70972, -122.38266, 60, ["windy", "afternoon"], "pair", 5],
  ["The garage geometry", "Enter the public stairwell at the Fifth and Mission garage before the evening rush. Make three abstract photos without showing a car.", "Fifth and Mission Garage", "SoMa", 37.78331, -122.40663, 30, ["late_afternoon"], "solo", 4],
  ["The single lit window", "Climb Ina Coolbrith after blue hour. Photograph one lit window across the city while keeping every nearer window dark.", "Ina Coolbrith Park", "Russian Hill", 37.79843, -122.41328, 30, ["blue_hour"], "solo", 3],
  ["The tide erases it", "Draw a tiny shape at the edge of Ocean Beach during an incoming tide. Photograph it once per wave until it is gone.", "Ocean Beach at Rivera", "Outer Sunset", 37.74634, -122.50778, 30, ["incoming_tide", "sunset"], "pair", 4],
].map(toSeed("photo"));

const food: Seed[] = [
  ["The bakery's first mistake", "Arrive at a neighborhood bakery within fifteen minutes of opening. Ask what came out misshapen and take whatever they point to.", "John Campbell's Irish Bakery", "Outer Sunset", 37.75392, -122.49743, 30, ["early_morning"], "pair", 4],
  ["The unlabeled soda", "Go to a corner store after 8 PM and choose a drink whose flavor you cannot identify from the label. Split it three ways and vote before looking it up.", "Samiramis Imports", "Mission", 37.74246, -122.42219, 30, ["night"], "group", 5],
  ["The last dumpling rule", "Order one unfamiliar dumpling per person just before the lunch rush ends. Nobody can claim the last piece; settle it with rock-paper-scissors.", "House of Pancakes", "Taraval", 37.74286, -122.47844, 60, ["late_lunch"], "group", 3],
  ["The five-dollar picnic", "Each person gets five dollars at the Alemany market in its last hour. Build one shared picnic without buying the same color twice.", "Alemany Farmers Market", "Bernal Heights", 37.73543, -122.40967, 60, ["market_closing"], "group", 4],
  ["The pastry compass", "Buy one pastry you have never tried on a foggy morning. Walk in the direction its pointed end faces and eat it at the first bench.", "Pineapple King Bakery", "Outer Sunset", 37.76396, -122.47708, 30, ["foggy", "morning"], "pair", 4],
  ["The menu blind spot", "At a family diner before 9 AM, order the breakfast item printed in the smallest type. Trade exactly one bite with your friend.", "Breakfast at Tiffany's", "Portola", 37.72673, -122.40377, 60, ["early_morning"], "pair", 3],
  ["The bus-stop dessert", "Buy one cold dessert after sunset and eat it at the next bus shelter, even if no bus is coming. Rate only the shelter's ambiance.", "Marco Polo Italian Ice Cream", "Outer Sunset", 37.74314, -122.47857, 30, ["night"], "pair", 4],
  ["The mystery herb", "Visit a produce market in the final hour and buy the herb you recognize least. Smell it on the walk home and build dinner around it.", "Manila Oriental Market", "Excelsior", 37.72536, -122.43424, 60, ["late_afternoon"], "solo", 4],
  ["The warm tortilla timer", "Arrive at the tortilleria before noon and buy the smallest stack. Eat one plain before it stops steaming; save the rest for someone else.", "La Palma Mexicatessen", "Mission", 37.75297, -122.40943, 30, ["morning"], "pair", 3],
  ["The one-block progressive dinner", "On one block after 6 PM, get a snack, a drink, and something sweet from three different counters. You cannot sit down between stops.", "San Bruno Avenue", "Portola", 37.72927, -122.40445, 60, ["evening"], "group", 4],
  ["The off-menu color", "Ask for the brightest thing the kitchen can make without naming an ingredient. Share it, and guess the dominant flavor before anyone speaks to the server again.", "Tadu Ethiopian Kitchen", "Tenderloin", 37.78383, -122.41407, 60, ["late_lunch"], "group", 5],
  ["The bread-end rescue", "Visit a bakery thirty minutes before closing and ask whether any bread ends need a home. Take them to the nearest overlook with one good spread.", "Arizmendi Bakery", "Inner Sunset", 37.76345, -122.46616, 60, ["before_closing"], "pair", 3],
  ["The freezer-door oracle", "At a small market after 9 PM, let the foggiest freezer door choose your snack. Buy the first item visible when the glass clears.", "Duc Loi Supermarket", "Mission", 37.756, -122.41857, 30, ["night"], "pair", 5],
  ["The soup weather pact", "Wait for a day below 55 degrees, then order the soup with the fewest English words in its description. Eat it outside anyway.", "Yuanbao Jiaozi", "Outer Sunset", 37.75396, -122.49425, 60, ["cold", "lunch"], "pair", 4],
  ["The two-neighborhood sandwich", "Buy bread on one side of Mission Street and the filling on the other before noon. Assemble the sandwich at Precita Park with no utensils.", "Mission Street at Cortland", "Bernal Heights", 37.74075, -122.42306, 60, ["morning"], "pair", 4],
  ["The final tray bet", "Reach a dim sum bakery in the last hour. Each person silently points to the final item they think will sell out; split whichever one disappears first.", "Good Mong Kok Bakery", "Chinatown", 37.79536, -122.40822, 30, ["late_afternoon"], "group", 4],
].map(toSeed("food"));

const weird: Seed[] = [
  ["The house with a second face", "Walk the Sunnyside side streets at dusk until you find a house that looks like a face. Give it a name, but do not photograph it.", "Monterey Boulevard", "Sunnyside", 37.73173, -122.44313, 30, ["dusk"], "pair", 5],
  ["The public phone séance", "Find a surviving payphone after dark. Pick it up, listen for ten seconds, and leave a voicemail for your future self from your real phone.", "Geneva Avenue Payphone", "Excelsior", 37.71828, -122.4402, 15, ["night"], "solo", 5],
  ["The city's smallest parade", "Bring three objects that make different sounds to an empty block before 7 AM. March them from one corner to the next and stop when a window opens.", "Egbert Avenue", "Bayview", 37.71694, -122.39291, 30, ["early_morning"], "group", 5],
  ["The wrong-way viewpoint", "Reach Grandview before sunset, then face the least impressive direction. Convince your friend it is the best view in the city.", "Grandview Park East Slope", "Inner Sunset", 37.75637, -122.47195, 30, ["sunset"], "pair", 4],
  ["The anonymous monument", "Find a plaque in McLaren Park that neither person understands. Invent the event it commemorates and deliver a thirty-second speech.", "McLaren Park", "Excelsior", 37.7176, -122.4197, 60, ["afternoon"], "pair", 5],
  ["The midnight chess problem", "Draw an eight-square chessboard in sidewalk chalk after 10 PM. Play a game using found objects and leave the losing king behind.", "Precita Park", "Bernal Heights", 37.7473, -122.41337, 30, ["night"], "pair", 5],
  ["The echo census", "Enter the pedestrian tunnel under Bosworth after the evening rush. Test five sounds and rank their echoes without using your voice.", "Bosworth Pedestrian Tunnel", "Glen Park", 37.73328, -122.4342, 30, ["evening"], "group", 5],
  ["The borrowed constellation", "Lie on the grass at Holly Park after 9 PM. Connect five lit apartment windows into a constellation and name it after a group-chat joke.", "Holly Park", "Bernal Heights", 37.73709, -122.41727, 30, ["night"], "group", 4],
  ["The staircase prophecy", "Climb the Farnsworth steps on a windy day. At each landing, write down the first word you hear; read the sentence only at the top.", "Farnsworth Steps", "Forest Hill", 37.7488, -122.46408, 30, ["windy"], "pair", 5],
  ["The tiny door census", "Walk one block of Noe Valley just after sunrise and count every door too small for a person. Stop at seven, even if the block is unfinished.", "Elizabeth Street", "Noe Valley", 37.75241, -122.43425, 30, ["sunrise"], "solo", 4],
  ["The fog exchange", "Bring a sealed note to Mount Davidson when the summit is hidden in fog. Trade notes with your friend without reading them until you are below the cloud.", "Mount Davidson", "Miraloma Park", 37.73822, -122.45428, 60, ["foggy"], "pair", 5],
  ["The fence museum", "Choose a block in Bayview at midday and curate a five-piece museum made entirely of things caught in fences. Give the tour in a whisper.", "Third Street at Quesada", "Bayview", 37.73312, -122.39027, 30, ["midday"], "pair", 5],
  ["The pigeon committee", "Sit near a quiet plaza at lunch and assign every pigeon a job title. Leave when the CEO flies away.", "Persia Triangle", "Excelsior", 37.72365, -122.43516, 30, ["lunch"], "group", 4],
  ["The invisible boundary", "Walk from the Mission into Bernal at blue hour. Each person silently decides where the neighborhood changed; compare answers only after crossing Cortland.", "Mission Street South", "Bernal Heights", 37.74204, -122.42161, 60, ["blue_hour"], "pair", 4],
  ["The reverse time capsule", "Find something harmless on the sidewalk that looks ten years old. Write a note explaining today to it, photograph both, then take only the note home.", "Visitacion Avenue", "Visitacion Valley", 37.71338, -122.40892, 30, ["afternoon"], "solo", 5],
  ["The one-person audience", "Go to the outdoor stage at Cayuga before 8 AM. Perform one minute of anything for exactly one carved wooden figure.", "Cayuga Playground", "Outer Mission", 37.71485, -122.45039, 30, ["early_morning"], "solo", 5],
].map(toSeed("weird"));

function toSeed(vibe: Quest["vibe"]) {
  return (row: unknown[]): Seed => {
    const [title, body, name, neighborhood, lat, lng, durationMin, bestTime, groupSize, weirdness] = row;
    return {
      title: title as string,
      body: body as string,
      vibe,
      location: {
        name: name as string,
        neighborhood: neighborhood as string,
        address: `${name as string}, ${neighborhood as string}, San Francisco, CA`,
        lat: lat as number,
        lng: lng as number,
      },
      durationMin: durationMin as Quest["durationMin"],
      bestTime: bestTime as string[],
      groupSize: groupSize as Quest["groupSize"],
      weirdness: weirdness as Quest["weirdness"],
    };
  };
}

const quests: Quest[] = [...active, ...chill, ...photo, ...food, ...weird].map(
  (quest, index) => ({ id: `q_${String(index + 1).padStart(3, "0")}`, ...quest }),
);

if (quests.length !== 80 || new Set(quests.map(({ id }) => id)).size !== 80) {
  throw new Error(`Expected 80 unique quests, got ${quests.length}`);
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const output = resolve(scriptDir, "../data/quests.json");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(quests, null, 2)}\n`, "utf8");
console.log(`Wrote ${quests.length} quests to ${output}`);
