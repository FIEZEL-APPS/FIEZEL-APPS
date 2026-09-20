import json

data = {
  "code": "KOMP-ENG-D-8-BAB3-01",
  "grade": 8,
  "name": "Chapter 3: Love Our World",
  "materi": "Environmental Conservation Texts, Reducing Plastic Waste, Procedural Posters & Tips, Imperative Expressions for Saving Water/Energy",
  "cpRef": "English for Nusantara untuk SMP/MTs Kelas VIII",
  "items": [
    {
      "id": "eng-d-8-c3-q01",
      "difficulty": "dasar",
      "prompt": "Based on English for Nusantara Grade VIII (pages 157-159 Unit 1 Comic Strip 3.1), what causes the trash bin at the school canteen to overflow?",
      "options": [
        "Plastic waste from snack wrappers and straws",
        "Overflowing paper waste from old school notebooks",
        "Leftover organic food waste from the school kitchen",
        "Broken glass bottles and discarded aluminium cans"
      ],
      "answer": 0,
      "why": {
        "0": "The trash bin at the canteen overflows mainly because it is filled with plastic waste from snack wrappers and straws."
      },
      "distractorWhy": {
        "1": "Notebook paper waste is not mentioned as filling the canteen trash bin.",
        "2": "Kitchen organic food waste is not the primary cause stated in the text.",
        "3": "Glass bottles and aluminium cans are not mentioned in Comic Strip 3.1."
      }
    },
    {
      "id": "eng-d-8-c3-q02",
      "difficulty": "sedang",
      "prompt": "Based on English for Nusantara Grade VIII (page 158 Unit 1 Comic Strip 3.1), what action do Monita and Andre decide to take for their future canteen lunches to reduce plastic waste?",
      "options": [
        "Bring their own food containers from home",
        "Buy more packaged snacks with plastic straws",
        "Ask the canteen sellers to use single-use paper bags",
        "Throw their plastic trash in another school bin"
      ],
      "answer": 0,
      "why": {
        "0": "Monita suggests bringing their own food containers next time to avoid generating plastic wrapper waste."
      },
      "distractorWhy": {
        "1": "Buying more packaged snacks increases plastic consumption.",
        "2": "Asking canteen sellers for paper bags is not the specific action agreed upon.",
        "3": "Throwing trash elsewhere does not reduce overall plastic usage."
      }
    },
    {
      "id": "eng-d-8-c3-q03",
      "difficulty": "dasar",
      "prompt": "Based on English for Nusantara Grade VIII (page 159 Unit 1 Worksheet 3.2), what does Monita mean when she says \"Good idea, Andre!\"?",
      "options": [
        "She agrees with Andre's suggestion to reduce plastic waste",
        "She thinks Andre should buy more snacks at the canteen",
        "She wants Andre to clean the canteen trash bin by himself",
        "She doubts whether reducing plastic waste will help the environment"
      ],
      "answer": 0,
      "why": {
        "0": "\"Good idea\" expresses agreement with Andre's proposal to bring food containers from home to reduce plastic waste."
      },
      "distractorWhy": {
        "1": "Buying more snacks contradicts the idea of reducing waste.",
        "2": "She is not instructing Andre to clean the trash bin.",
        "3": "She fully supports saving the environment rather than doubting it."
      }
    },
    {
      "id": "eng-d-8-c3-q04",
      "difficulty": "sedang",
      "prompt": "Based on English for Nusantara Grade VIII (pages 160-163 Unit 1 Handwashing Procedure), what is the proper action regarding the water faucet while rubbing hands with soap?",
      "options": [
        "Turn off the faucet while rubbing hands to save water",
        "Keep the faucet running continuously throughout handwashing",
        "Increase the water flow to rinse the soap faster",
        "Splash water onto the floor to keep hands wet"
      ],
      "answer": 0,
      "why": {
        "0": "The procedure specifies turning off the faucet while rubbing hands with soap so water is not wasted."
      },
      "distractorWhy": {
        "1": "Leaving the faucet running wastes clean water needlessly.",
        "2": "Increasing water flow while soaping is wasteful.",
        "3": "Splashing water on the floor is improper and unhygienic."
      }
    },
    {
      "id": "eng-d-8-c3-q05",
      "difficulty": "dasar",
      "prompt": "Based on English for Nusantara Grade VIII (page 163 Unit 1 Did You Know section), what common health problem is caused by unhygienic water and unsafe sanitation?",
      "options": [
        "Diarrhea",
        "Influenza",
        "Asthma",
        "Tooth decay"
      ],
      "answer": 0,
      "why": {
        "0": "Unhygienic water and poor sanitation frequently cause diarrhea, which can prevent children from attending school."
      },
      "distractorWhy": {
        "1": "Influenza is an airborne viral respiratory disease.",
        "2": "Asthma is a chronic respiratory condition unrelated to water sanitation.",
        "3": "Tooth decay is related to dental hygiene and diet rather than waterborne pathogens."
      }
    },
    {
      "id": "eng-d-8-c3-q06",
      "difficulty": "sedang",
      "prompt": "Based on English for Nusantara Grade VIII (page 164 Unit 1 Language Focus Table 3.2), which expression is appropriate for the \"Showing the steps\" stage of a procedural presentation?",
      "options": [
        "First, turn on the faucet and wash our hands with running water.",
        "Good afternoon everyone, my name is Alifandra.",
        "I am going to show you how to wash our hands without wasting water.",
        "Thank you very much for your kind attention."
      ],
      "answer": 0,
      "why": {
        "0": "\"First, ...\" is a sequential transition marker used to present procedural steps."
      },
      "distractorWhy": {
        "1": "This expression belongs to the starting the presentation stage.",
        "2": "This expression belongs to the stating the goal stage.",
        "3": "This expression belongs to the ending the presentation stage."
      }
    },
    {
      "id": "eng-d-8-c3-q07",
      "difficulty": "sedang",
      "prompt": "Based on English for Nusantara Grade VIII (pages 166-168 Unit 1 Comic Strip 3.3), why does Galang remind Pipit while she is washing her hands?",
      "options": [
        "Because Pipit left the faucet running while rubbing her hands with soap",
        "Because Pipit forgot to use soap when washing her hands",
        "Because Pipit rubbed her hands for only five seconds",
        "Because Pipit used dirty river water instead of tap water"
      ],
      "answer": 0,
      "why": {
        "0": "Galang points out that leaving the tap running while soaping hands wastes precious water."
      },
      "distractorWhy": {
        "1": "Pipit was using soap, but left the water running.",
        "2": "Pipit was rubbing her hands for 60 seconds.",
        "3": "Pipit was using tap water at school."
      }
    },
    {
      "id": "eng-d-8-c3-q08",
      "difficulty": "dasar",
      "prompt": "Based on English for Nusantara Grade VIII (pages 174-175 Unit 2 Comic Strip 3.4), what topic is discussed in the social media post that Monita shares with her friends?",
      "options": [
        "Sorting trash to help save the earth",
        "Playing online video games on weekends",
        "Ordering fast food online for school lunch",
        "Buying fashion items on discount sales"
      ],
      "answer": 0,
      "why": {
        "0": "Monita shares a social media post written by a girl about how to sort household trash to save the environment."
      },
      "distractorWhy": {
        "1": "Video games are not mentioned in Monita's post.",
        "2": "Fast food delivery is unrelated to the environmental post.",
        "3": "Online shopping is not the topic of the post."
      }
    },
    {
      "id": "eng-d-8-c3-q09",
      "difficulty": "sedang",
      "prompt": "Based on English for Nusantara Grade VIII (pages 178-179 Unit 2 Picture 3.3 Language Focus), what should we do before commenting on social media?",
      "options": [
        "Read and understand the content carefully, then think if we have something necessary and polite to offer",
        "Post immediate emotional reactions without reading the whole text",
        "Use aggressive words to win arguments in the comment section",
        "Share private personal phone numbers and home addresses publicly"
      ],
      "answer": 0,
      "why": {
        "0": "Responsible social media etiquette requires reading carefully and commenting politely only when offering necessary, constructive thoughts."
      },
      "distractorWhy": {
        "1": "Reacting emotionally without reading causes misunderstanding.",
        "2": "Aggressive words spark unnecessary quarrels.",
        "3": "Sharing private details online compromises personal safety."
      }
    },
    {
      "id": "eng-d-8-c3-q10",
      "difficulty": "dasar",
      "prompt": "Based on English for Nusantara Grade VIII (page 180 Unit 2 Internet Safety Rules), which practice is recommended for staying safe online?",
      "options": [
        "Do not share personal information such as home address and phone number online",
        "Download files freely from unknown and suspicious websites",
        "Trust anyone you meet on social media right away",
        "Post negative comments to criticise classmates publicly"
      ],
      "answer": 0,
      "why": {
        "0": "Protecting privacy by withholding home address and phone number is a core rule for online safety."
      },
      "distractorWhy": {
        "1": "Downloading from suspicious sites exposes devices to malware.",
        "2": "Trusting strangers online poses serious safety risks.",
        "3": "Posting hurtful content constitutes cyberbullying."
      }
    },
    {
      "id": "eng-d-8-c3-q11",
      "difficulty": "dasar",
      "prompt": "Based on English for Nusantara Grade VIII (pages 183-184 Unit 2 Section 6), what main problem does @in22day express in the social media post?",
      "options": [
        "Having too many old books in the room that are no longer read",
        "Lacking money to buy school textbooks",
        "Losing an important library book at school",
        "Wanting to build a commercial bookstore in town"
      ],
      "answer": 0,
      "why": {
        "0": "@in22day asks friends for advice on what to do with accumulated old books that are no longer read."
      },
      "distractorWhy": {
        "1": "Lacking money is not @in22day's expressed problem.",
        "2": "No mention of losing a school library book.",
        "3": "@in22day is seeking ways to manage personal unused books, not starting a commercial business."
      }
    },
    {
      "id": "eng-d-8-c3-q12",
      "difficulty": "sedang",
      "prompt": "Based on English for Nusantara Grade VIII (pages 183-184 Unit 2 Worksheet 3.14), what is the first step to donate old books to Bina Karya orphanage according to @titalesta?",
      "options": [
        "Fill in the donation form on the provided website link",
        "Send the books directly by post without filling out any form",
        "Sell the books at Palasari Market first",
        "Cover the books with plastic layers"
      ],
      "answer": 0,
      "why": {
        "0": "@titalesta states: \"First fill in the form in the link www.binakaryadonation.com\"."
      },
      "distractorWhy": {
        "1": "Sending books before filling out the online form misses the required initial step.",
        "2": "Selling books at Palasari Market is @zalvafsp's suggestion, not @titalesta's donation step.",
        "3": "Covering books with plastic is part of @zalvafsp's selling procedure."
      }
    },
    {
      "id": "eng-d-8-c3-q13",
      "difficulty": "tinggi",
      "prompt": "Based on English for Nusantara Grade VIII (pages 183-184 Unit 2 Section 6), which commenter gives a response that is not related to solving @in22day's problem with old books?",
      "options": [
        "@shakila, who recommends watching movies",
        "@agungibr, who suggests making a cardboard mini library",
        "@titalesta, who invites book donations for an orphanage",
        "@zalvafsp, who suggests selling good condition books at Palasari Market"
      ],
      "answer": 0,
      "why": {
        "0": "@shakila's comment asks about movie recommendations, which does not address the issue of managing old books."
      },
      "distractorWhy": {
        "1": "@agungibr gives a detailed step-by-step method to build a mini bookshelf.",
        "2": "@titalesta offers a clear donation channel for the books.",
        "3": "@zalvafsp provides practical steps to resell unused books."
      }
    },
    {
      "id": "eng-d-8-c3-q14",
      "difficulty": "sedang",
      "prompt": "Based on English for Nusantara Grade VIII (pages 187-193 Unit 3 Section 3), what are the two main elements of an instructional procedural poster?",
      "options": [
        "Goal and Steps",
        "Orientation and Reorientation",
        "Complication and Resolution",
        "Thesis and Arguments"
      ],
      "answer": 0,
      "why": {
        "0": "Instructional procedural posters focus on communicating a clear Goal and procedural Steps."
      },
      "distractorWhy": {
        "1": "Orientation and Reorientation belong to recount or narrative text structures.",
        "2": "Complication and Resolution belong to narrative texts.",
        "3": "Thesis and Arguments belong to exposition texts."
      }
    },
    {
      "id": "eng-d-8-c3-q15",
      "difficulty": "tinggi",
      "prompt": "Based on English for Nusantara Grade VIII (pages 194-195 Unit 3 Language Focus Table 3.4), what visual effect do warm colors (ranging from yellow to reddish violet) create in poster design?",
      "options": [
        "They appear to come forward, look larger, and are suitable for foreground elements",
        "They appear to move backward, look smaller, and are suitable for background elements",
        "They create a cold, quiet, and sad atmosphere exclusively",
        "They make text unreadable and obscure all visual details"
      ],
      "answer": 0,
      "why": {
        "0": "Warm colors make visual elements come forward and look larger, making them ideal for foreground emphasis."
      },
      "distractorWhy": {
        "1": "Moving backward and looking smaller is the visual effect of cool colors.",
        "2": "Cold, quiet, and sad moods are associated with cool colors.",
        "3": "Warm colors are strategically used to draw attention, not obscure details."
      }
    },
    {
      "id": "eng-d-8-c3-q16",
      "difficulty": "tinggi",
      "prompt": "Based on English for Nusantara Grade VIII (page 195 Unit 3 Table 3.4), how is an analogous color combination formed on a color wheel for poster creation?",
      "options": [
        "By combining colors that are next to each other on the color wheel, such as sky blue, green, and yellowish green",
        "By combining colors directly opposite each other on the color wheel, such as yellow and violet",
        "By combining dark black and pure white without any hues",
        "By selecting random colors with no spatial relationship on the wheel"
      ],
      "answer": 0,
      "why": {
        "0": "Analogous color schemes use adjacent colors on the color wheel to create harmonious visual balance."
      },
      "distractorWhy": {
        "1": "Combining opposite colors forms a complementary color scheme.",
        "2": "Black and white form a monochromatic/achromatic contrast, not analogous hues.",
        "3": "Analogous combinations follow strict adjacency rules on the color wheel."
      }
    },
    {
      "id": "eng-d-8-c3-q17",
      "difficulty": "sedang",
      "prompt": "Based on English for Nusantara Grade VIII (page 196 Unit 3 Table 3.4), what visual characteristic distinguishes a complementary color combination (e.g., yellow and violet)?",
      "options": [
        "Striking contrast between opposite colors on the color wheel",
        "Subtle, calm, and invisible blending of identical tones",
        "Monochrome grayscale without any bright highlights",
        "Smooth pastel shades with zero visual impact"
      ],
      "answer": 0,
      "why": {
        "0": "Complementary colors sit opposite each other on the color wheel, producing high-contrast, striking visuals."
      },
      "distractorWhy": {
        "1": "Identical tones lack the high contrast of complementary pairs.",
        "2": "Grayscale does not describe chromatic complementary color pairs.",
        "3": "Complementary colors produce striking visual impact rather than zero impact."
      }
    },
    {
      "id": "eng-d-8-c3-q18",
      "difficulty": "sedang",
      "prompt": "Based on English for Nusantara Grade VIII (page 197 Unit 3 Table 3.5), what is the main purpose of adding illustrations to an environmental procedural poster?",
      "options": [
        "To clarify and represent the intended procedural steps visually",
        "To fill all blank spaces so that no text can be read",
        "To decorate the poster with unrelated cartoon characters",
        "To hide the main goal of the poster from readers"
      ],
      "answer": 0,
      "why": {
        "0": "Illustrations in posters complement the text, making the procedural steps clear and engaging."
      },
      "distractorWhy": {
        "1": "Overcrowding blank space makes posters unreadable.",
        "2": "Unrelated decorative images distract from the poster's key message.",
        "3": "Illustrations should clarify the main goal, not hide it."
      }
    },
    {
      "id": "eng-d-8-c3-q19",
      "difficulty": "dasar",
      "prompt": "Based on English for Nusantara Grade VIII (page 198 Unit 3 Section 5 Fun Time), what word in the crossword puzzle corresponds to the clue \"the thing that runs water\"?",
      "options": [
        "Faucet",
        "Towel",
        "Soap",
        "Poster"
      ],
      "answer": 0,
      "why": {
        "0": "A faucet is the plumbing fixture that controls and supplies running water."
      },
      "distractorWhy": {
        "1": "A towel is used for drying hands.",
        "2": "Soap is used for cleansing.",
        "3": "A poster is a printed paper or cardboard displaying information."
      }
    },
    {
      "id": "eng-d-8-c3-q20",
      "difficulty": "tinggi",
      "prompt": "Based on English for Nusantara Grade VIII (pages 160 and 190 Imperative Expressions), which sentence correctly uses an imperative form to instruct someone to conserve water when washing hands?",
      "options": [
        "Turn off the faucet while rubbing your hands with soap.",
        "You are turning off the faucet right now.",
        "Did you turn off the faucet after washing?",
        "The faucet was turned off by Galang."
      ],
      "answer": 0,
      "why": {
        "0": "\"Turn off...\" is a direct imperative sentence starting with a base verb to give clear procedural instructions."
      },
      "distractorWhy": {
        "1": "This is a present continuous declarative sentence.",
        "2": "This is a past tense interrogative sentence.",
        "3": "This is a passive voice sentence in the simple past tense."
      }
    }
  ]
}

with open(r'c:\Users\hp\fiezel-apps\tools\chunk_eng_8_c3.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print('Successfully created chunk_eng_8_c3.json with', len(data['items']), 'items.')
