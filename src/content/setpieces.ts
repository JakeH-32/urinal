// Handmade puzzle rooms. Every `answer` is checked against the engine in src/engine/setpieces.test.ts.
// Rounds 2, 4 and 6 of each daily come from here (difficulty must be 2, 4 or 6).
// Voice: docs/VOICE.md. The premise carries the context (blurbs only show on hover).
// Stalls are rare on purpose: at most 4 rooms have one, and only 2 (both difficulty 6) answer with it.
import type { SetPiece } from '../types';

export const SET_PIECES: SetPiece[] = [
  // ---------------------------------------------------------------------------
  // Difficulty 2: plain guys. One wrinkle each: wall vs door, room vs wall,
  // low / puddle / broken urinals, the cowardly stall, the least-bad spot.
  // ---------------------------------------------------------------------------
  {
    // Both ends have the same room. The door end gets the foot traffic.
    id: 'sp-open-house',
    difficulty: 2,
    venue: 'Open house, Sunday 1 to 4',
    premise: 'Both rival bidders are in here. The realtor keeps opening the door to show people the bathroom.',
    layout: '_ _ N _ N _ _',
    door: 'right',
    people: [
      { name: 'The man with the cash offer', blurb: 'Waived the inspection. Announced it in the driveway.' },
      { name: 'The man who brought his contractor', blurb: 'The contractor is measuring your future kitchen.' },
    ],
    answer: 1,
  },
  {
    // The corner is taken. The roomiest spot left is the one by the door.
    id: 'sp-ten-year-reunion',
    difficulty: 2,
    venue: 'Your 10-year reunion',
    premise: 'The class president took the corner. His old campaign manager is two down, still guarding him.',
    layout: '_ _ _ N _ N',
    door: 'left',
    people: [
      { name: 'The class president’s campaign manager', blurb: 'Still says “we” about the election.' },
      { name: 'The class president', blurb: 'Sells insurance now. Still campaigning.' },
    ],
    answer: 1,
  },
  {
    // The wall urinal is broken, so the new "far end" is one gap from a guy.
    id: 'sp-ballpark-raffle',
    difficulty: 2,
    venue: 'Ballpark, seventh-inning stretch',
    premise: 'The corner urinal has worn a garbage bag since opening day. The guy selling 50/50 tickets is two down from it.',
    layout: 'X _ N _ _ _ _ _ N',
    door: 'right',
    people: [
      { name: 'The 50/50 raffle guy', blurb: 'Has a roll of tickets and your section number.' },
      { name: 'A season-ticket holder', blurb: 'Knows every usher by name. Is learning yours.' },
    ],
    answer: 6,
  },
  {
    // The roomiest spot is a puddle at the wall. The clean one beside it wins.
    id: 'sp-suede-loafers',
    difficulty: 2,
    venue: 'Outlet mall, the shoe wing',
    premise: 'You bought suede loafers an hour ago and wore them out of the store.',
    layout: 'W _ _ _ N',
    door: 'right',
    people: [{ name: 'A mall walker', blurb: 'On lap nine. Logs every lap on his watch.' }],
    answer: 2,
  },
  {
    // Every full-size urinal is next to someone. The low one isn't.
    id: 'sp-truck-stop',
    difficulty: 2,
    venue: 'Truck stop, holiday weekend',
    premise: 'Two truckers got here first. They spaced themselves for their convenience, not yours.',
    layout: 'N _ _ N _ L',
    door: 'left',
    people: [
      { name: 'A long-haul trucker', blurb: 'Eleven hours in. Has thoughts on the left lane.' },
      { name: 'A trucker in mirrored sunglasses', blurb: 'Indoors. Still on.' },
    ],
    answer: 6,
  },
  {
    // Three urinals, both free ones touch him. Same damage either way, so the wall.
    id: 'sp-ferry-three',
    difficulty: 2,
    venue: 'Ferry, the 4:10 crossing',
    premise: 'Three urinals, a man in the middle one, and a line forming behind you.',
    layout: '_ N _',
    door: 'left',
    people: [{ name: 'A man in a fishing vest', blurb: 'Twenty pockets. He’s checking all of them.' }],
    answer: 3,
  },
  {
    // Crowded, but one urinal still keeps the urinal code. The open stall is the coward's pick.
    id: 'sp-kickoff-stall',
    difficulty: 2,
    venue: 'Sports bar, two minutes to kickoff',
    premise: 'Three guys at the urinals, kickoff in two minutes, and the stall door is standing wide open.',
    layout: 'N _ _ _ N _ N S',
    door: 'left',
    people: [
      { name: 'A man in a throwback jersey', blurb: 'The player on it retired in 1994.' },
      { name: 'Your waiter', blurb: 'Hasn’t brought your wings. Knows you noticed.' },
      { name: 'A man who bet the over', blurb: 'Refreshing the odds on his phone.' },
    ],
    answer: 3,
  },
  {
    // Evenly spaced row. The only spot not beside anyone is the low one by the door.
    id: 'sp-tax-seminar',
    difficulty: 2,
    venue: 'Tax seminar, lunch break',
    premise: 'Four accountants have spaced themselves out with professional precision. You’re the remainder.',
    layout: 'L _ N _ N _ N _ N',
    door: 'left',
    people: [
      { name: 'An accountant named Doug', blurb: 'Deducts his gym membership. Doesn’t go.' },
      { name: 'Another accountant named Doug', blurb: 'No relation. They checked.' },
      { name: 'A CPA in a lanyard', blurb: 'It says “Ask Me About Depreciation.” Nobody has.' },
      { name: 'A man who audits for fun', blurb: 'Not for work. For fun.' },
    ],
    answer: 1,
  },
  {
    // Every gap is between two men except the last one, by the door.
    id: 'sp-symphony',
    difficulty: 2,
    venue: 'The symphony, intermission',
    premise: 'Five men in every other urinal, and the second bell is ringing.',
    layout: 'N _ N _ N _ N _ N _',
    door: 'right',
    people: [
      { name: 'A man in row F since 1988', blurb: 'Mentions row F. Mentions 1988.' },
      { name: 'A man who clapped between movements', blurb: 'Twice tonight. Proud of both.' },
      { name: 'The cellist’s husband', blurb: 'Has heard this piece four hundred times. Hums it wrong.' },
      { name: 'A man in a rented tux', blurb: 'The tag is still on. It goes back Monday.' },
      { name: 'A man who read the program notes aloud', blurb: 'To his wife. To row F.' },
    ],
    answer: 10,
  },
  {
    // The wall spot is the low urinal. Same room by the door, normal urinal: that wins.
    id: 'sp-deck-quote',
    difficulty: 2,
    venue: 'Lumber yard, 6 a.m.',
    premise: 'The contractor who quoted your deck is in here. His quote assumed you’re the kind of guy who settles.',
    layout: 'L _ _ N _ _ _',
    door: 'right',
    people: [{ name: 'The contractor who quoted your deck', blurb: 'Twenty-two thousand dollars. For a deck.' }],
    answer: 7,
  },
  {
    // The corner is open but tight. The middle of the big gap has more room.
    id: 'sp-dealership-manager',
    difficulty: 2,
    venue: 'Car dealership, waiting on financing',
    premise: 'Your salesman said he had to go talk to his manager. They’re both in here.',
    layout: 'N _ _ _ _ _ N _ _',
    door: 'left',
    people: [
      { name: 'The sales manager', blurb: 'Has never approved anything on the first ask.' },
      { name: 'Your salesman, Ricky', blurb: 'Has called you “my guy” eleven times.' },
    ],
    answer: 4,
  },
  {
    // The only spot with a gap on both sides has a puddle in it.
    id: 'sp-dentist-scramble',
    difficulty: 2,
    venue: 'Charity golf scramble',
    premise: 'Three dentists from the same practice are in here. Nobody has cleaned this room since the shotgun start.',
    layout: 'N _ W _ N _ N _',
    door: 'right',
    people: [
      { name: 'Dr. Pratt', blurb: 'Has a 14 handicap and your X-rays.' },
      { name: 'Dr. Lund', blurb: 'Bills in fifteen-minute increments, including today.' },
      { name: 'Dr. Fenn', blurb: 'Calls every missed putt “a little sensitivity.”' },
    ],
    answer: 3,
  },
  {
    // The door end ties the middle on room, but the door end isn't a wall.
    id: 'sp-delayed-flight',
    difficulty: 2,
    venue: 'Airport, delayed to 9:40',
    premise: 'Your flight is delayed again, and everyone on it will come through that door eventually.',
    layout: '_ _ _ N _ _ _ _ _ N',
    door: 'left',
    people: [
      { name: 'The man in 23C', blurb: 'You’re in 24C. He reclines.' },
      { name: 'A man in a neck pillow', blurb: 'Has worn it since the parking garage.' },
    ],
    answer: 7,
  },
  {
    // The two broken urinals are the buffers. The spot between them is clean.
    id: 'sp-out-of-order',
    difficulty: 2,
    venue: 'Office, third-floor men’s room',
    premise: 'Facilities bagged two urinals as out of order. Nobody believes it was an accident.',
    layout: '_ N X _ X N _ N',
    door: 'right',
    people: [
      { name: 'Gene from Facilities', blurb: 'Bagged them himself. Won’t say why.' },
      { name: 'A man from Legal', blurb: 'Read the out-of-order sign twice, slowly.' },
      { name: 'Your desk neighbor', blurb: 'Eats almonds one at a time. All day.' },
    ],
    answer: 4,
  },
  {
    // Both middle spots touch somebody. No wall free, so the one away from the door.
    id: 'sp-bus-depot',
    difficulty: 2,
    venue: 'Bus depot, 11:55 p.m.',
    premise: 'Four urinals, a stranger at each end, and your bus leaves in three minutes.',
    layout: 'N _ _ N',
    door: 'right',
    people: [
      { name: 'A man with all his luggage', blurb: 'All of it. In here.' },
      { name: 'A man in a security guard uniform', blurb: 'Not a security guard. You asked.' },
    ],
    answer: 2,
  },

  // ---------------------------------------------------------------------------
  // Difficulty 4: one or two quirk guys. The talker leans around dividers, the
  // drunk sways into the roomy side, the splasher and the boss reach farther.
  // ---------------------------------------------------------------------------
  {
    // The middle is boss on one side, talker on the other. Only the spot by the door clears both.
    id: 'sp-final-interview',
    difficulty: 4,
    venue: 'Job interview, final round',
    premise: 'The man interviewing you is in here. So is the other finalist, and he won’t stop talking.',
    layout: 'B _ _ _ _ T _ _ _',
    door: 'right',
    people: [
      { name: 'The man interviewing you', blurb: 'Asked where you see yourself in five years. You said “here.”' },
      { name: 'The other finalist', blurb: 'Has a portfolio. Has it with him now.' },
    ],
    answer: 9,
  },
  {
    // The corner behind the divider looks safe. The talker talks over it.
    id: 'sp-draft-commissioner',
    difficulty: 4,
    venue: 'Fantasy league draft party',
    premise: 'The league commissioner is explaining the keeper rule to the room. There’s a divider. He’s taller than the divider.',
    layout: '_ _ | T _ _ _ _ N',
    door: 'right',
    people: [
      { name: 'The league commissioner', blurb: 'Changed the scoring in week 9. Still defending it.' },
      { name: 'Last year’s champion', blurb: 'Brought the trophy. It’s in his car.' },
    ],
    answer: 6,
  },
  {
    // The drunk sways into the wide gap. The cramped side past him is the clean one.
    id: 'sp-rehearsal-list',
    difficulty: 4,
    venue: 'Rehearsal dinner, second bottle',
    premise: 'The groom’s brother has been listing left since the salad course. There’s a nice wide gap on that side.',
    layout: '_ N _ _ _ _ D< _ _',
    door: 'left',
    people: [
      { name: 'The officiant', blurb: 'Got ordained online on Tuesday.' },
      { name: 'The groom’s brother', blurb: 'His toast is ready. It’s mostly about him.' },
    ],
    answer: 9,
  },
  {
    // The classic spot between the two of them is inside the splash.
    id: 'sp-boot-camp',
    difficulty: 4,
    venue: 'Gym, after the 6 a.m. boot camp',
    premise: 'Your trainer is in here. He has never done anything at less than full intensity.',
    layout: 'N _ _ _ P _ _ _',
    door: 'left',
    people: [
      { name: 'A man who skipped boot camp', blurb: 'Came for the smoothie bar.' },
      { name: 'Your trainer, Brandon', blurb: 'Charges $90 an hour to yell “one more.”' },
    ],
    answer: 8,
  },
  {
    // The corner is two empty urinals from the boss. He needs three.
    id: 'sp-managing-partner',
    difficulty: 4,
    venue: 'Law firm, partners’ retreat',
    premise: 'The managing partner votes on you Thursday. He likes his space, and he bills for it.',
    layout: '_ _ _ B _ _ _ _ _ N',
    door: 'right',
    people: [
      { name: 'The managing partner', blurb: 'Has never said “good job.” Said “fine” in 2019.' },
      { name: 'A first-year associate', blurb: 'Has billed fourteen hours today. It’s noon.' },
    ],
    answer: 8,
  },
  {
    // He leans toward the corner, so the corner is his. The door end is the clean spot.
    id: 'sp-eggnog',
    difficulty: 4,
    venue: 'Holiday party, after the gift exchange',
    premise: 'Ken from Accounts Receivable is three eggnogs deep and leaning hard toward the corner.',
    layout: '_ _ N _ _ D> _ _ _',
    door: 'left',
    people: [
      { name: 'The guy who drew your name', blurb: 'Got you a candle. Said “sorry” handing it over.' },
      { name: 'Ken from Accounts Receivable', blurb: 'Has started calling the CEO “big man.”' },
    ],
    answer: 1,
  },
  {
    // Two dividers between you and the talker do nothing. The low urinal is out of his range.
    id: 'sp-timeshare',
    difficulty: 4,
    venue: 'Your wife’s family reunion',
    premise: 'Your wife’s Uncle Walt has a timeshare he’d love for you to own. To him, the dividers are a suggestion.',
    layout: 'L _ _ T | _ | _ N',
    door: 'right',
    people: [
      { name: 'Uncle Walt', blurb: 'Two weeks a year in Branson. Every year. Forever.' },
      { name: 'Your wife’s cousin', blurb: 'Said no to the timeshare in 2017. Still hears about it.' },
    ],
    answer: 1,
  },
  {
    // The boss's reach covers every clean urinal on his side. The puddle is just past it.
    id: 'sp-review-break',
    difficulty: 4,
    venue: 'Your annual review, 10-minute break',
    premise: 'Your review is in ten minutes, and the man giving it just walked in ahead of you.',
    layout: 'B _ _ _ W _ N',
    door: 'left',
    people: [
      { name: 'Your manager, Mr. Dorsey', blurb: 'Has your review printed out. Highlighted.' },
      { name: 'The guy up for the same promotion', blurb: 'Already ordered a nameplate.' },
    ],
    answer: 5,
  },
  {
    // Exactly one spot is two clear of both. The divider in the corner doesn't buy enough.
    id: 'sp-charity-5k',
    difficulty: 4,
    venue: 'Charity 5K, the finish line',
    premise: 'The race organizer is thanking sponsors to anyone in range, and the guy who sprinted the finish is still bouncing.',
    layout: 'T | _ _ _ _ _ P | _',
    door: 'left',
    people: [
      { name: 'The race organizer', blurb: 'Has thanked the bank, the dentist and the radio station. Twice.' },
      { name: 'The guy who sprinted the finish', blurb: 'Passed a man in a hot dog costume. Still celebrating.' },
    ],
    answer: 4,
  },
  {
    // No clean spot. Next to the silent neighbor beats anywhere near the talker, divider or not.
    id: 'sp-newsletter',
    difficulty: 4,
    venue: 'Neighborhood cookout',
    premise: 'The neighborhood newsletter editor is gathering material. The only other guy in here hasn’t spoken to you since the leaf blower incident.',
    layout: '_ N _ _ T | _',
    door: 'left',
    people: [
      { name: 'Your neighbor Glenn', blurb: '6:45 a.m., a Saturday. You both remember.' },
      { name: 'The newsletter editor', blurb: 'Prints it himself. Has a section called “Concerns.”' },
    ],
    answer: 1,
  },
  {
    // He sways into the big gap. The clean spot is past the far guy, in the corner.
    id: 'sp-party-bus',
    difficulty: 4,
    venue: 'Bachelor party, the brewery bus',
    premise: 'The groom is three IPAs in and tilting toward the far wall like it called his name.',
    layout: 'N _ D> _ _ _ _ N _ _',
    door: 'left',
    people: [
      { name: 'The best man', blurb: 'Planned all of this. Has a spreadsheet.' },
      { name: 'The groom', blurb: 'Has hugged the bus driver twice.' },
      { name: 'The bride’s brother', blurb: 'Here to report back.' },
    ],
    answer: 10,
  },
  {
    // Three urinals, both free ones touch him. Stand behind his lean, not in it.
    id: 'sp-power-ballad',
    difficulty: 4,
    venue: 'Karaoke bar, last call',
    premise: 'Three urinals. The man who closed karaoke with a power ballad is in the middle, swaying toward the door.',
    layout: '_ D> _',
    door: 'right',
    people: [{ name: 'The power ballad guy', blurb: 'Held the last note for forty seconds. Bowed to the bartender.' }],
    answer: 1,
  },
  {
    // A long gap, two big zones. Exactly one urinal clears both.
    id: 'sp-orientation',
    difficulty: 4,
    venue: 'Orientation, day one',
    premise: 'Your new CEO is by the door. The onboarding guy is near the corner, still onboarding.',
    layout: '_ _ T _ _ _ _ _ _ B',
    door: 'right',
    people: [
      { name: 'The onboarding guy', blurb: 'Has a forty-slide deck about the coffee machine.' },
      { name: 'Your new CEO', blurb: 'Shook your hand this morning. Called you Brian.' },
    ],
    answer: 6,
  },
  {
    // Two middles look equal. The splasher needs one more urinal, so shade toward the other guy.
    id: 'sp-weigh-in',
    difficulty: 4,
    venue: 'Bass tournament, the weigh-in',
    premise: 'A man in chest waders has the corner. He stands like he’s still on the boat.',
    layout: 'P _ _ _ _ _ _ N _ _',
    door: 'right',
    people: [
      { name: 'A man in chest waders', blurb: 'Hasn’t taken them off since Thursday.' },
      { name: 'The tournament leader', blurb: 'Seven pounds, four ounces. He’ll tell you about the ounces.' },
    ],
    answer: 5,
  },
  {
    // Splash on one side, sway on the other. The low urinal is the only spot out of both.
    id: 'sp-homecoming',
    difficulty: 4,
    venue: 'Homecoming, the tailgate',
    premise: 'Your college roommate is leaning toward the door, and your old teammate still stands like he’s boxing out.',
    layout: '_ P _ _ L _ D> _ _',
    door: 'right',
    people: [
      { name: 'Your old teammate, Moose', blurb: 'Still wears the knee brace. Wore it to his wedding.' },
      { name: 'Your college roommate', blurb: 'Has used your college nickname six times. Loudly.' },
    ],
    answer: 5,
  },

  // ---------------------------------------------------------------------------
  // Difficulty 6: combos. Least-bad picks, the only legal spot behind a divider,
  // wall vs door on equal room, and the two rooms where the stall is right.
  // ---------------------------------------------------------------------------
  {
    // Boss reach plus drunk sway cover every urinal. The stall is correct.
    id: 'sp-wedding-cocktail',
    difficulty: 6,
    venue: 'Your wedding, cocktail hour',
    premise: 'Your new father-in-law is in here. So is your best man, who has been tipping toward the corner since the champagne toast.',
    layout: '_ B _ _ _ _ D> _ _ S',
    door: 'left',
    people: [
      { name: 'Your new father-in-law', blurb: 'Toasted “the man she chose.” Paused before “chose.”' },
      { name: 'Your best man', blurb: 'Lost the rings once today. Found them in the ice sculpture.' },
    ],
    answer: 10,
  },
  {
    // A divider everywhere and none of them help. The stall by the door is correct.
    id: 'sp-privacy-fins',
    difficulty: 6,
    venue: 'The new headquarters, opening day',
    premise: 'Every urinal at the new HQ has a divider. The architect is explaining them, and the facilities director stands a full step back from his.',
    layout: '_ | _ | T | _ | _ | _ | P S',
    door: 'right',
    people: [
      { name: 'The architect', blurb: 'Calls the dividers “privacy fins.” Has named each one.' },
      { name: 'The facilities director', blurb: 'Picked the tile. Regrets the tile.' },
    ],
    answer: 8,
  },
  {
    // The low urinal beside your dad is legal thanks to the divider, so the stall is cowardice.
    id: 'sp-dads-retirement',
    difficulty: 6,
    venue: 'Your dad’s retirement dinner',
    premise: 'Your dad’s old business partner is telling the 1987 sales conference story again. Your dad has never used a stall in his life.',
    layout: 'S _ _ T _ _ N | L',
    door: 'left',
    people: [
      { name: 'Your dad’s old business partner', blurb: 'Bought your dad out in 1994. Brings it up as a joke.' },
      { name: 'Your dad', blurb: 'Thirty-one years at one company. They gave him a clock.' },
    ],
    answer: 8,
  },
  {
    // The drunk leans toward the boss, so the wide gap is his. The puddle behind him is the spot.
    id: 'sp-awards-banquet',
    difficulty: 6,
    venue: 'Awards banquet, after dessert',
    premise: 'Craig from Marketing has had the open bar and found the CEO. He’s leaning in.',
    layout: 'N _ W _ D> _ _ _ _ B',
    door: 'left',
    people: [
      { name: 'The emcee', blurb: 'Mispronounced your name on stage. Twice, differently.' },
      { name: 'Craig from Marketing', blurb: 'Accepted Employee of the Quarter like a lifetime achievement award.' },
      { name: 'The CEO', blurb: 'Handed out every award. None to you.' },
    ],
    answer: 3,
  },
  {
    // No stall, no clean spot. Beside your cousin by the door beats the corner in the lawyer's zone.
    id: 'sp-reading-of-the-will',
    difficulty: 6,
    venue: 'The reading of the will',
    premise: 'The estate lawyer is in here an hour before the reading. So is your cousin, who also thinks he’s getting the boat.',
    layout: '_ N _ _ B _ _',
    door: 'left',
    people: [
      { name: 'Your cousin Rodney', blurb: 'Visited Grandpa twice. Both this year.' },
      { name: 'The estate lawyer', blurb: 'Knows who gets the boat. Isn’t saying.' },
    ],
    answer: 1,
  },
  {
    // The spot beside the VP breaks one rule. The other spot breaks two.
    id: 'sp-regional-vp',
    difficulty: 6,
    venue: 'Regional office, the small bathroom',
    premise: 'The regional VP flew in for the day. He has one end of a four-urinal bathroom, and Stu, who tells him everything, has the other.',
    layout: 'B _ _ N',
    door: 'right',
    people: [
      { name: 'The regional VP', blurb: 'Flew in to “get a feel for the team.” Brought a list.' },
      { name: 'Stu from your team', blurb: 'Tells the VP everything. Calls it “visibility.”' },
    ],
    answer: 2,
  },
  {
    // No clean spot. Right behind the uncle's back is the smallest violation in the room.
    id: 'sp-wedding-dj',
    difficulty: 6,
    venue: 'Your brother’s wedding, the after-party',
    premise: 'The DJ is pitching his podcast to anyone in range. Your uncle is tilting toward the DJ like he’s interested.',
    layout: '_ T _ _ D< _',
    door: 'left',
    people: [
      { name: 'The DJ', blurb: 'Also hosts a podcast about being a DJ.' },
      { name: 'Uncle Ray', blurb: 'Requested the same song four times. Got it four times.' },
    ],
    answer: 6,
  },
  {
    // Every spot touches someone. The corner beside the foreman is the only one-rule break with no talker in it.
    id: 'sp-holdout',
    difficulty: 6,
    venue: 'Jury duty, day three of deliberations',
    premise: 'Eleven of you agree. The holdout is in here, walking everyone through the timeline again.',
    layout: 'N _ N _ _ T _ _ N _',
    door: 'left',
    people: [
      { name: 'Juror No. 3', blurb: 'Has a flight Friday. Mentions it hourly.' },
      { name: 'Juror No. 7', blurb: 'Took notes on everything, including lunch.' },
      { name: 'The holdout', blurb: 'Has “just one more question” about the timeline.' },
      { name: 'The foreman', blurb: 'Volunteered. Regrets it.' },
    ],
    answer: 10,
  },
  {
    // Everything breaks the urinal code. The low one is only one urinal short of the splasher.
    id: 'sp-gala-auction',
    difficulty: 6,
    venue: 'Charity gala, after the live auction',
    premise: 'The gala chairman is in here, and so is the man who won the auction, still celebrating like it was a touchdown.',
    layout: '_ _ B _ _ _ _ P _ L',
    door: 'left',
    people: [
      { name: 'The gala chairman', blurb: 'Seated you at table 31. There are 31 tables.' },
      { name: 'The man who won the auction', blurb: 'Paid $40,000 for a week at a lake house. Still pumping his fist.' },
    ],
    answer: 10,
  },
  {
    // The corner is in the sway. Two from the drunk's back and three from the talker is clean.
    id: 'sp-25-year-reunion',
    difficulty: 6,
    venue: 'Your 25-year reunion',
    premise: 'The old quarterback is recapping the state semifinal, play by play. The class clown is leaning toward the corner, mostly by accident.',
    layout: 'T _ _ _ _ D> _ _ _',
    door: 'left',
    people: [
      { name: 'The old quarterback', blurb: 'Threw four interceptions that night. Remembers a win.' },
      { name: 'The class clown', blurb: 'Still does his impression of Mr. Halloran. Mr. Halloran is here.' },
    ],
    answer: 4,
  },
  {
    // Both ends have exactly enough room. One of them is a wall.
    id: 'sp-panel-moderator',
    difficulty: 6,
    venue: 'Industry conference, before your panel',
    premise: 'The moderator wants to rehearse your answers, and the conference founder is two down from him. Attendees keep coming through that door.',
    layout: '_ _ _ T _ B _ _ _ _',
    door: 'right',
    people: [
      { name: 'The panel moderator', blurb: 'Has seven “quick questions” before the panel.' },
      { name: 'The conference founder', blurb: 'Picks next year’s speakers. Writes nothing down.' },
    ],
    answer: 1,
  },
  {
    // The only legal spot is beside the quiet cousin, and only because of the divider.
    id: 'sp-sisters-wedding',
    difficulty: 6,
    venue: 'Your sister’s wedding, the receiving line',
    premise: 'Your sister’s new father-in-law has the corner. Her new brother-in-law is by the door, still dancing.',
    layout: 'B _ _ _ N | _ _ _ P',
    door: 'right',
    people: [
      { name: 'Your sister’s new father-in-law', blurb: 'Called your family “very down-to-earth.” Twice.' },
      { name: 'The groom’s quiet cousin', blurb: 'Has said four words all day, all to the bartender.' },
      { name: 'Your sister’s new brother-in-law', blurb: 'Won the dance-off. Is still in the dance-off.' },
    ],
    answer: 6,
  },
  {
    // Two drunks leaning apart. The one clean urinal is between their backs.
    id: 'sp-groomsmen-feud',
    difficulty: 6,
    venue: 'A wedding, an hour before the ceremony',
    premise: 'Two groomsmen have been leaning away from each other since the argument about the bachelor party.',
    layout: '_ _ D< _ _ _ D> _ _ _',
    door: 'right',
    people: [
      { name: 'The groom’s college roommate', blurb: 'Planned Vegas. Lost the deposit.' },
      { name: 'The groom’s brother', blurb: 'Wanted a cabin. Still bringing up the cabin.' },
    ],
    answer: 5,
  },
  {
    // The puddle in the corner has more room. The clean urinal behind the divider still outranks it.
    id: 'sp-member-guest',
    difficulty: 6,
    venue: 'Member-guest tournament, the clubhouse',
    premise: 'You’re a guest at this club, and the club president is in here. So is the man who just birdied 18, still in his follow-through.',
    layout: 'W _ _ _ B _ _ P | _ _',
    door: 'right',
    people: [
      { name: 'The club president', blurb: 'Asked who you’re “here with.” Wrote it down.' },
      { name: 'The man who birdied 18', blurb: 'Has described the putt to the bartender, the cart attendant and the ice machine.' },
    ],
    answer: 10,
  },
  {
    // Two mirror-image spots behind two dividers. The splasher's divider counts. The talker's doesn't.
    id: 'sp-small-claims',
    difficulty: 6,
    venue: 'Small claims court, recess',
    premise: 'The man you’re suing is in the corner, eager to settle this out loud. The man who just won his case is near the door, still celebrating.',
    layout: 'T | _ _ _ _ P | _ _',
    door: 'right',
    people: [
      { name: 'The man you’re suing', blurb: 'Built his fence eleven inches into your yard. Wants to “talk it out.”' },
      { name: 'A man who just won his case', blurb: 'Got $1,400 back from his landscaper. Still celebrating.' },
    ],
    answer: 8,
  },
];
