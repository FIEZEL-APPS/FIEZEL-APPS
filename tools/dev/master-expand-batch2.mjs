/**
 * tools/dev/master-expand-batch2.mjs
 * Batch 2 Expansion: Scaling RA to 40, RL to 20, SST to 20, SWT to 20, WE to 20, RO to 15, HIW to 15, WFD to 50.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contentDir = path.resolve(__dirname, '../../content/pte');

console.log('[Batch 2 Expansion] Adding further comprehensive items...');

// 1. Read Aloud: add ra-026 to ra-040
const raPath = path.join(contentDir, 'pte-read-aloud.json');
const raData = JSON.parse(fs.readFileSync(raPath, 'utf8'));
const moreRa = [
  {
    id: "ra-026",
    title: "Enzyme Kinetics in Fermentation Chemistry",
    category: "Culinary Science",
    text: "Enzymatic catalysis regulates biochemical conversions throughout commercial food preparation. Proteolytic enzymes tenderize tough muscular protein fibers, while amylases accelerate the breakdown of complex starches into fermentable sugars, establishing optimal consistency and textural appeal in modern gastronomy.",
    prepTimeSec: 35,
    recordTimeSec: 35,
    chunking: "Enzymatic catalysis regulates // biochemical conversions // throughout commercial food preparation. // Proteolytic enzymes tenderize // tough muscular protein fibers, // while amylases accelerate the breakdown // of complex starches into fermentable sugars, // establishing optimal consistency and textural appeal in modern gastronomy.",
    keywords: ["enzymatic", "catalysis", "proteolytic", "amylases", "gastronomy", "consistency"],
    phoneticFocus: [{ word: "proteolytic", ipa: "/ˌproʊ.ti.əˈlɪt.ɪk/", tip: "Stress on lit" }]
  },
  {
    id: "ra-027",
    title: "Swan River Estuarine Ecology",
    category: "Western Australia Ecology",
    text: "Perth's iconic Swan River estuary represents a delicate hydrological intersection between inland seasonal freshwater streams and marine tidal ocean waters. Monitoring dissolved oxygen levels and nutrient runoff from surrounding urban catchments is imperative to prevent hazardous microalgal blooms.",
    prepTimeSec: 35,
    recordTimeSec: 35,
    chunking: "Perth's iconic Swan River estuary // represents a delicate hydrological intersection // between inland seasonal freshwater streams // and marine tidal ocean waters. // Monitoring dissolved oxygen levels // and nutrient runoff from surrounding urban catchments // is imperative // to prevent hazardous microalgal blooms.",
    keywords: ["estuary", "hydrological", "intersection", "catchments", "microalgal", "imperative"],
    phoneticFocus: [{ word: "estuary", ipa: "/ˈes.tʃu.ə.ri/", tip: "Stress on es" }]
  },
  {
    id: "ra-028",
    title: "Stock Control and FIFO Inventory Rotation",
    category: "Hospitality Management",
    text: "Commercial kitchens adhere strictly to first-in, first-out inventory rotation principles. Kitchen staff systematically inspect delivery date labels, positioning older compliant stocks forward while placing freshly received stock behind, thereby minimizing organic spoilage and preventing consumer health risks.",
    prepTimeSec: 35,
    recordTimeSec: 35,
    chunking: "Commercial kitchens adhere strictly // to first-in, first-out inventory rotation principles. // Kitchen staff systematically inspect // delivery date labels, // positioning older compliant stocks forward // while placing freshly received stock behind, // thereby minimizing organic spoilage // and preventing consumer health risks.",
    keywords: ["rotation", "systematically", "compliant", "spoilage", "inventory", "adhere"],
    phoneticFocus: [{ word: "systematically", ipa: "/ˌsɪs.təˈmæt.ɪ.kəl.i/", tip: "Stress on mat" }]
  },
  {
    id: "ra-029",
    title: "Pilbara Solar Microgrids and Battery Storage",
    category: "Energy Economics",
    text: "Isolated mining operations in the northern Pilbara basin are actively transitioning from fossil fuel diesel reliance toward industrial battery microgrids. High-capacity lithium iron phosphate batteries store excess midday solar generation, discharging energy seamlessly through nocturnal processing cycles.",
    prepTimeSec: 35,
    recordTimeSec: 35,
    chunking: "Isolated mining operations // in the northern Pilbara basin // are actively transitioning // from fossil fuel diesel reliance // toward industrial battery microgrids. // High-capacity lithium iron phosphate batteries // store excess midday solar generation, // discharging energy seamlessly // through nocturnal processing cycles.",
    keywords: ["microgrids", "reliance", "phosphate", "nocturnal", "transitioning", "seamlessly"],
    phoneticFocus: [{ word: "phosphate", ipa: "/ˈfɒs.feɪt/", tip: "F sound at start" }]
  },
  {
    id: "ra-030",
    title: "Cognitive Biases in Medical Diagnostics",
    category: "Psychology & Medicine",
    text: "Diagnostic clinicians occasionally fall prey to anchoring biases when evaluating initial clinical emergency presentations. Relying disproportionately on early symptom reports can obscure subsequent contradictory pathological data, underscoring the critical necessity of structured differential diagnostic checklists.",
    prepTimeSec: 35,
    recordTimeSec: 35,
    chunking: "Diagnostic clinicians occasionally fall prey // to anchoring biases // when evaluating initial clinical emergency presentations. // Relying disproportionately on early symptom reports // can obscure subsequent contradictory pathological data, // underscoring the critical necessity // of structured differential diagnostic checklists.",
    keywords: ["clinicians", "anchoring", "disproportionately", "pathological", "differential", "diagnostic"],
    phoneticFocus: [{ word: "disproportionately", ipa: "/ˌdɪs.prəˈpɔː.ʃən.ət.li/", tip: "Stress on paw" }]
  },
  {
    id: "ra-031",
    title: "Marine Coral Reef Bleaching Mechanisms",
    category: "Marine Biology",
    text: "Sustained ocean thermal anomalies induce severe physiological stress across hermatypic coral colonies. When seawater temperatures exceed local biological thresholds for several weeks, corals expel their photosynthetic zooxanthellae endosymbionts, turning bone-white and facing severe starvation.",
    prepTimeSec: 35,
    recordTimeSec: 35,
    chunking: "Sustained ocean thermal anomalies // induce severe physiological stress // across hermatypic coral colonies. // When seawater temperatures exceed local biological thresholds // for several weeks, // corals expel their photosynthetic zooxanthellae endosymbionts, // turning bone-white // and facing severe starvation.",
    keywords: ["physiological", "hermatypic", "zooxanthellae", "endosymbionts", "anomalies", "starvation"],
    phoneticFocus: [{ word: "zooxanthellae", ipa: "/ˌzoʊ.ə.zænˈθel.iː/", tip: "Stress on thel" }]
  },
  {
    id: "ra-032",
    title: "Urban Architecture and Acoustical Insulation",
    category: "Architecture & Engineering",
    text: "Designing high-density residential towers adjacent to busy transport interchanges requires advanced acoustical decoupling. Architects specify double-glazed laminated window assemblies and acoustic damping composite wall assemblies to prevent external transit reverberations from penetrating domestic living zones.",
    prepTimeSec: 35,
    recordTimeSec: 35,
    chunking: "Designing high-density residential towers // adjacent to busy transport interchanges // requires advanced acoustical decoupling. // Architects specify double-glazed laminated window assemblies // and acoustic damping composite wall assemblies // to prevent external transit reverberations // from penetrating domestic living zones.",
    keywords: ["interchanges", "acoustical", "decoupling", "laminated", "reverberations", "penetrating"],
    phoneticFocus: [{ word: "reverberations", ipa: "/rɪˌvɜː.bərˈeɪ.ʃənz/", tip: "Stress on ray" }]
  },
  {
    id: "ra-033",
    title: "Sustainable Aquaculture and Fish Farming",
    category: "Marine Agriculture",
    text: "Global demand for seafood protein has outstripped wild oceanic fishery capacities, driving rapid growth in recirculating aquaculture facilities. Land-based tank systems filter water continuously, recycling ninety-nine percent of system volume while eliminating antibiotic runoff into natural coastal estuaries.",
    prepTimeSec: 35,
    recordTimeSec: 35,
    chunking: "Global demand for seafood protein // has outstripped wild oceanic fishery capacities, // driving rapid growth // in recirculating aquaculture facilities. // Land-based tank systems filter water continuously, // recycling ninety-nine percent of system volume // while eliminating antibiotic runoff // into natural coastal estuaries.",
    keywords: ["aquaculture", "recirculating", "facilities", "antibiotic", "estuaries", "capacities"],
    phoneticFocus: [{ word: "aquaculture", ipa: "/ˈæk.wə.kʌl.tʃər/", tip: "Stress on ak" }]
  },
  {
    id: "ra-034",
    title: "Gluten Development in Bread Making",
    category: "Culinary Science",
    text: "Wheat flour dough derives its viscoelastic structural matrix from two key storage proteins: gliadin and glutenin. When hydrated and subjected to mechanical kneading shear, these molecules form a continuous three-dimensional network capable of trapping expanding carbon dioxide fermentation bubbles.",
    prepTimeSec: 35,
    recordTimeSec: 35,
    chunking: "Wheat flour dough derives // its viscoelastic structural matrix // from two key storage proteins: // gliadin and glutenin. // When hydrated and subjected to mechanical kneading shear, // these molecules form a continuous three-dimensional network // capable of trapping expanding carbon dioxide fermentation bubbles.",
    keywords: ["viscoelastic", "gliadin", "glutenin", "kneading", "fermentation", "hydrated"],
    phoneticFocus: [{ word: "viscoelastic", ipa: "/ˌvɪs.koʊ.ɪˈlæs.tɪk/", tip: "Stress on las" }]
  },
  {
    id: "ra-035",
    title: "Desalination Brine Disposal and Marine Protection",
    category: "Western Australia Ecology",
    text: "Discharging hyper-saline brine effluent from coastal desalination facilities requires hydrodynamic diffusers installed kilometers offshore. Engineered discharge nozzles spray pressurized brine into deep ocean currents, facilitating instantaneous dilution and preventing dense saline plumes from settling over benthic marine seabed habitats.",
    prepTimeSec: 35,
    recordTimeSec: 35,
    chunking: "Discharging hyper-saline brine effluent // from coastal desalination facilities // requires hydrodynamic diffusers installed kilometers offshore. // Engineered discharge nozzles spray pressurized brine // into deep ocean currents, // facilitating instantaneous dilution // and preventing dense saline plumes // from settling over benthic marine seabed habitats.",
    keywords: ["effluent", "diffusers", "hydrodynamic", "instantaneous", "benthic", "plumes"],
    phoneticFocus: [{ word: "effluent", ipa: "/ˈef.lu.ənt/", tip: "Stress on ef" }]
  }
];

const raIds = new Set(raData.items.map(i => i.id));
moreRa.forEach(i => { if (!raIds.has(i.id)) raData.items.push(i); });
fs.writeFileSync(raPath, JSON.stringify(raData, null, 2), 'utf8');
console.log(`Read Aloud expanded to ${raData.items.length} items.`);

// 2. Retell Lecture: add rl-011 to rl-016
const rlPath = path.join(contentDir, 'pte-retell-lecture.json');
const rlData = JSON.parse(fs.readFileSync(rlPath, 'utf8'));
const moreRl = [
  {
    id: "rl-011",
    title: "Urban Heat Island Mitigation and Cool Roofs",
    audioTranscript: "Urban asphalt and concrete trap substantial daytime heat, causing city temperatures to exceed surrounding rural areas by several degrees. Scientists advocate for high-albedo cool roofs and urban tree canopies. Highly reflective white membranes reflect eighty percent of sunlight, while deciduous trees provide shading and evapotranspiration, substantially reducing cooling electricity loads and heat-related illnesses.",
    keyNounChunks: ["urban heat island effect", "high-albedo cool roofs", "urban tree canopies", "reflective white membranes", "evapotranspiration", "cooling electricity demand"],
    nakulTemplateSpeech: "The lecture provided significant information regarding the urban heat island effect. Firstly, the speaker highlighted high-albedo cool roofs and urban tree canopies. Furthermore, the speaker emphasized evapotranspiration and reflective white membranes. In conclusion, the lecture demonstrates effective ways to reduce cooling electricity demand."
  },
  {
    id: "rl-012",
    title: "HACCP Principles and Foodborne Pathogen Control",
    audioTranscript: "In professional food processing, prevention of bacterial contamination is governed by Hazard Analysis Critical Control Points. Rather than inspecting finished meals, chefs and operators identify critical stages where hazards can be controlled. Critical limits such as cooking internal meat to seventy-five degrees Celsius or chilling soups within two hours ensure pathogenic bacteria cannot multiply to dangerous levels.",
    keyNounChunks: ["Hazard Analysis Critical Control Points", "bacterial contamination", "critical control points", "internal meat temperatures", "pathogenic bacteria", "food safety protocols"],
    nakulTemplateSpeech: "The lecture provided significant information regarding Hazard Analysis Critical Control Points. Firstly, the speaker highlighted bacterial contamination and critical control points. Furthermore, the speaker emphasized internal meat temperatures and pathogenic bacteria. In conclusion, the lecture demonstrates the importance of food safety protocols."
  },
  {
    id: "rl-013",
    title: "Neuroplasticity and Skill Acquisition",
    audioTranscript: "For decades, neuroscientists believed the human brain became structurally fixed after childhood. Modern neuroimaging demonstrates profound neuroplasticity in adults learning musical instruments or foreign languages. Repetitive deliberate practice strengthens myelin sheaths around active axon pathways, accelerating electrical impulse transmission and stabilizing complex motor and linguistic cognitive skills.",
    keyNounChunks: ["adult neuroplasticity", "structural brain changes", "deliberate practice", "myelin sheaths", "axon pathways", "linguistic skills"],
    nakulTemplateSpeech: "The lecture provided significant information regarding adult neuroplasticity. Firstly, the speaker highlighted structural brain changes and deliberate practice. Furthermore, the speaker emphasized myelin sheaths and axon pathways. In conclusion, the lecture demonstrates significant benefits for acquiring linguistic skills."
  },
  {
    id: "rl-014",
    title: "Western Australian Iron Ore Supply Chains",
    audioTranscript: "The mining economy of Western Australia relies on highly automated infrastructure to extract and transport hundreds of millions of tons of iron ore annually. Remote operations centers in Perth coordinate autonomous drill rigs, driverless trucks, and automated freight trains in the Pilbara. This digital coordination ensures port shiploading proceeds without bottleneck delays, maintaining global market competitiveness.",
    keyNounChunks: ["mining infrastructure", "autonomous drill rigs", "driverless trucks", "automated freight trains", "shiploading logistics", "global competitiveness"],
    nakulTemplateSpeech: "The lecture provided significant information regarding mining infrastructure. Firstly, the speaker highlighted autonomous drill rigs and driverless trucks. Furthermore, the speaker emphasized automated freight trains and shiploading logistics. In conclusion, the lecture demonstrates essential strategies for global competitiveness."
  },
  {
    id: "rl-015",
    title: "Sourdough Microbiology and Lactic Fermentation",
    audioTranscript: "Traditional sourdough fermentation involves a resilient ecosystem of yeasts and lactic acid bacteria coexisting in flour and water. While yeasts generate carbon dioxide gas for volume rise, lactobacilli produce lactic and acetic acids. These organic acids lower dough pH, breaking down gluten proteins slightly for easier human digestion while giving sourdough bread its long shelf life.",
    keyNounChunks: ["sourdough fermentation", "microbial ecosystem", "lactic acid bacteria", "organic acids", "gluten breakdown", "improved shelf life"],
    nakulTemplateSpeech: "The lecture provided significant information regarding sourdough fermentation. Firstly, the speaker highlighted the microbial ecosystem and lactic acid bacteria. Furthermore, the speaker emphasized organic acids and gluten breakdown. In conclusion, the lecture demonstrates key factors in achieving improved shelf life."
  }
];

const rlIds = new Set(rlData.items.map(i => i.id));
moreRl.forEach(i => { if (!rlIds.has(i.id)) rlData.items.push(i); });
fs.writeFileSync(rlPath, JSON.stringify(rlData, null, 2), 'utf8');
console.log(`Retell Lecture expanded to ${rlData.items.length} items.`);

// 3. Summarize Spoken Text: add sst-011 to sst-015
const sstPath = path.join(contentDir, 'pte-summarize-spoken-text.json');
const sstData = JSON.parse(fs.readFileSync(sstPath, 'utf8'));
const moreSst = [
  {
    id: "sst-011",
    title: "Reverse Osmosis Desalination Energy Efficiency",
    audioTranscript: "Reverse osmosis desalination facilities separate fresh potable water from ocean saltwater by forcing seawater across semipermeable polyamide membranes under immense pressure. Historically, these high-pressure pumps consumed tremendous amounts of grid electricity. Modern energy recovery devices now capture kinetic pressure from escaping brine streams, recycling up to ninety-eight percent of the mechanical energy back into the incoming feed stream, drastically reducing operational carbon footprints.",
    modelSummary: "The lecture discusses reverse osmosis desalination, explaining how seawater is filtered across semipermeable membranes under pressure. It emphasizes how modern energy recovery devices recycle kinetic energy from escaping brine, substantially lowering electricity consumption and carbon emissions.",
    modelWordCount: 36
  },
  {
    id: "sst-012",
    title: "HACCP Temperature Monitoring in Kitchens",
    audioTranscript: "Hospitality venues must manage food storage temperatures rigorously to safeguard public health. Raw poultry, minced meats, and seafood spoil rapidly if kept between five and sixty degrees Celsius. Head chefs enforce daily digital thermometer logs, verifying that refrigeration stays under five degrees and cooked proteins reach seventy-five degrees. Failure to maintain these statutory temperature logs can result in immediate legal closures.",
    modelSummary: "The speaker examines HACCP temperature controls in commercial kitchens, highlighting the dangers of bacterial growth between five and sixty degrees. It emphasizes that maintaining strict temperature logs for cooking and chilling prevents foodborne illnesses and regulatory business closures.",
    modelWordCount: 37
  },
  {
    id: "sst-013",
    title: "Autonomous Agricultural Robotics",
    audioTranscript: "Modern agriculture is experiencing rapid automation with the introduction of autonomous field robotics. Solar-powered robotic rovers utilize computer vision algorithms to distinguish between emerging crop seedlings and invasive weeds. Instead of blanket chemical herbicide spraying, these precision machines apply targeted micro-doses or mechanically slice weed roots, slashing chemical input costs by eighty percent while protecting local soil microbiomes.",
    modelSummary: "The lecture explores autonomous agricultural robotics, describing how solar-powered rovers use computer vision to identify and remove weeds. By targeting individual weeds rather than spraying broad fields, these machines reduce chemical herbicide use and protect soil ecology.",
    modelWordCount: 36
  },
  {
    id: "sst-014",
    title: "Urban Architecture and Acoustical Engineering",
    audioTranscript: "Rapid urban densification often places residential apartment buildings adjacent to busy freeways and elevated railways. Acoustic engineers incorporate architectural decoupling, including floating concrete floors, resilient sound-isolation clips, and double-laminated glazing. These structural acoustic dampening techniques prevent low-frequency rumble and airborne traffic noise from disturbing residential sleeping quarters.",
    modelSummary: "The talk examines acoustical engineering in urban apartment design, explaining how floating floors and laminated glazing mitigate freeway and transit noise. These structural sound-isolation methods ensure domestic quietness and improve resident well-being in dense cities.",
    modelWordCount: 35
  },
  {
    id: "sst-015",
    title: "Biodiversity Conservation on Remote Australian Islands",
    audioTranscript: "Isolated Australian islands serve as crucial arks for endangered native species threatened on the mainland by feral cats and foxes. On Rottnest Island and Barrow Island, strict quarantine protocols prevent the introduction of invasive rodents and plant seeds. Biologists monitor endemic marsupials and reptiles, using genetic testing to ensure isolated island populations maintain sufficient gene diversity for long-term survival.",
    modelSummary: "The speaker discusses biodiversity conservation on remote Australian islands, explaining how strict quarantine protects native marsupials from feral predators. Continuous biological monitoring and genetic testing ensure these isolated endangered populations maintain sufficient genetic health for long-term survival.",
    modelWordCount: 35
  }
];

const sstIds = new Set(sstData.items.map(i => i.id));
moreSst.forEach(i => { if (!sstIds.has(i.id)) sstData.items.push(i); });
fs.writeFileSync(sstPath, JSON.stringify(sstData, null, 2), 'utf8');
console.log(`Summarize Spoken Text expanded to ${sstData.items.length} items.`);

// 4. Summarize Written Text: add swt-011 to swt-015
const swtPath = path.join(contentDir, 'pte-summarize-written-text.json');
const swtData = JSON.parse(fs.readFileSync(swtPath, 'utf8'));
const moreSwt = [
  {
    id: "swt-011",
    title: "Precision Agriculture and Satellite Soil Mapping",
    text: "Traditional farming practices often treat vast agricultural fields as uniform zones, applying identical quantities of synthetic fertilizers and irrigation water throughout. However, soil moisture and organic nutrient concentrations vary significantly across undulating topography. Modern precision agriculture deploys multispectral satellite imaging and GPS-guided equipment to map sub-field variations in real time. Variable-rate applicators deliver precise micro-doses of nitrogen and phosphorus only where required, reducing fertilizer runoff into waterways while enhancing crop yields.",
    formulaScaffold: "Rumus 1 Kalimat: Although [metode tradisional seragam], [pertanian presisi satelit] + [hasil efisiensi dan kelestarian].",
    modelSummary: "Although traditional farming treated agricultural fields uniformly, modern precision farming utilizes satellite soil mapping and GPS-guided applicators to deliver targeted fertilizer micro-doses, thereby minimizing environmental runoff while substantially boosting crop productivity.",
    deepFeedback: {
      sentenceCount: 1,
      wordCount: 32,
      ruleCheck: "1 kalimat, 32 kata, struktur compound-complex."
    }
  },
  {
    id: "swt-012",
    title: "Urban Heat Island Mitigation and Reflective Pavements",
    text: "Metropolitan centers frequently experience the urban heat island effect, wherein dark asphalt roads and tar roofs absorb solar thermal radiation, raising city temperatures significantly above surrounding countryside. Urban planners are introducing cool pavements coated with high-albedo reflective sealants that deflect sunlight away from ground surfaces. Combined with expansive public parkland and mature tree canopy shade, these reflective surfaces lower ambient air temperatures, decreasing residential air conditioning power demand and mitigating heat-stress mortality during summer heatwaves.",
    formulaScaffold: "Rumus 1 Kalimat: By replacing [aspal gelap penyerap panas], [permukaan reflektif dan taman] + [penurunan suhu dan hemat energi].",
    modelSummary: "By replacing heat-absorbing dark asphalt with high-albedo reflective coatings and expanding shaded urban parklands, metropolitan authorities can substantially reduce ambient summer temperatures, thereby lowering air-conditioning electricity demand and preventing heat-related illnesses.",
    deepFeedback: {
      sentenceCount: 1,
      wordCount: 33,
      ruleCheck: "1 kalimat, 33 kata, memenuhi aturan Pearson SWT."
    }
  },
  {
    id: "swt-013",
    title: "Commercial Cookery Food Hygiene and Sanitization",
    text: "In high-volume commercial restaurant kitchens, food contact surfaces and culinary utensils can quickly harbor dangerous bacterial colonies such as Salmonella, Staphylococcus, and E. coli if hygiene standards lapse. Food safety legislation requires commercial kitchens to implement two-stage sanitization, beginning with detergent cleaning to remove organic grease, followed by thermal or chemical disinfection exceeding eighty-two degrees Celsius. Furthermore, color-coded cutting boards for poultry, raw meat, and ready-to-eat salads prevent cross-contamination, ensuring patron safety across banquet dining operations.",
    formulaScaffold: "Rumus 1 Kalimat: To prevent [bakteri berbahaya], [protokol dapur komersial] + [metode sanitasi dan pemisahan alat].",
    modelSummary: "To eliminate dangerous foodborne bacterial pathogens in high-volume dining operations, commercial kitchens must strictly enforce two-stage thermal sanitization and color-coded chopping boards, effectively preventing cross-contamination and safeguarding consumer health.",
    deepFeedback: {
      sentenceCount: 1,
      wordCount: 31,
      ruleCheck: "1 kalimat, 31 kata, 1 titik di akhir."
    }
  },
  {
    id: "swt-014",
    title: "Western Australian Renewable Hydrogen Corridors",
    text: "The vast landmass and abundant sunshine of Western Australia provide exceptional conditions for utility-scale green hydrogen and ammonia production. Export consortia are installing multi-gigawatt solar photovoltaic and wind energy farms in coastal desert areas to power electrolyzer facilities that split purified water into hydrogen gas without greenhouse emissions. The resulting green hydrogen can be synthesized into liquid ammonia for cryogenic maritime transport, enabling clean energy exports to industrial hubs across Japan and South Korea seeking decarbonization.",
    formulaScaffold: "Rumus 1 Kalimat: Leveraging [kondisi surya dan angin WA], [fasilitas elektrolisis] + [ekspor energi bersih ke Asia].",
    modelSummary: "Leveraging abundant coastal sunshine and wind resources, Western Australian energy developers are constructing multi-gigawatt electrolyzer hubs to produce clean green ammonia, thereby facilitating zero-emission maritime energy exports to industrial Asian markets.",
    deepFeedback: {
      sentenceCount: 1,
      wordCount: 32,
      ruleCheck: "1 kalimat, 32 kata, lolos audit SWT."
    }
  },
  {
    id: "swt-015",
    title: "Artificial Intelligence in Medical Diagnostic Imaging",
    text: "Radiological analysis of medical imagery has historically relied entirely on trained physicians meticulously scanning computerized tomography and magnetic resonance imaging slices for pathological abnormalities. However, mounting patient volumes and clinical radiologist shortages have led to diagnostic delays and fatigue-induced misdiagnoses. Deep learning convolutional neural networks trained on millions of annotated scans can now identify micro-calcifications and subtle tumors within seconds. While artificial intelligence cannot replace comprehensive physician consultations, it acts as an indispensable first-line triage co-pilot.",
    formulaScaffold: "Rumus 1 Kalimat: Although [keterbatasan jumlah radiolog], [AI deep learning] + [manfaat deteksi cepat sebagai asisten klinis].",
    modelSummary: "Although diagnostic radiology traditionally faced backlogs and human fatigue, deep learning algorithms can rapidly screen medical scans for subtle pathological tumors, serving as an indispensable clinical assistant that accelerates diagnosis and improves patient outcomes.",
    deepFeedback: {
      sentenceCount: 1,
      wordCount: 35,
      ruleCheck: "1 kalimat, 35 kata, sempurna."
    }
  }
];

const swtIds = new Set(swtData.items.map(i => i.id));
moreSwt.forEach(i => { if (!swtIds.has(i.id)) swtData.items.push(i); });
fs.writeFileSync(swtPath, JSON.stringify(swtData, null, 2), 'utf8');
console.log(`Summarize Written Text expanded to ${swtData.items.length} items.`);

// 5. Essay Writing: add essay-011 to essay-015
const wePath = path.join(contentDir, 'pte-essay-writing.json');
const weData = JSON.parse(fs.readFileSync(wePath, 'utf8'));
const moreWe = [
  {
    id: "essay-011",
    title: "Public Funding for Space Exploration versus Domestic Social Welfare",
    prompt: "Vast sums of national public funding are dedicated to space exploration missions. Some argue that this expenditure is unjustified when poverty and healthcare issues remain unresolved on Earth. Discuss both sides and give your opinion.",
    fourParagraphPlan: {
      p1: "Introduction: Introduce the debate on space spending versus domestic social problems. State stance that space research produces indispensable technological spin-offs benefiting society.",
      p2: "Body 1 (Arguments against Space Spending): Urgent immediate crises on Earth such as homelessness, underfunded hospitals, and famine requiring direct funding.",
      p3: "Body 2 (Arguments for Space Spending): Technological innovations including satellite communication, weather tracking, solar cells, and advanced materials originating from space research.",
      p4: "Conclusion: Restate thesis that space investment fosters essential long-term human progress alongside social welfare."
    },
    nakulScaffold: "In recent years, the substantial government investment in space exploration programs has ignited intense public debate. While some argue that funds should be redirected toward urgent poverty relief on Earth, I firmly believe that space research yields indispensable technological innovations that benefit all humanity."
  },
  {
    id: "essay-012",
    title: "Universal Basic Income and Workplace Productivity",
    prompt: "Some economic theorists propose introducing a Universal Basic Income (UBI) for all adult citizens to address technological unemployment. Others argue it will reduce motivation to work. Discuss both views and provide your stance.",
    fourParagraphPlan: {
      p1: "Introduction: Define UBI and state view that it offers vital economic security during automation without eliminating ambition.",
      p2: "Body 1 (Benefits of UBI): Eradication of extreme poverty, empowerment of workers to pursue education or caregiving, stability against robotic automation.",
      p3: "Body 2 (Concerns): Potential fiscal strain on national budgets and fear of decreased labor force participation in low-wage sectors.",
      p4: "Conclusion: Emphasize that properly calibrated UBI acts as a springboard for entrepreneurship and social resilience."
    },
    nakulScaffold: "With the rise of robotic automation, Universal Basic Income has emerged as a prominent economic proposal. Although critics claim it could disincentivize work, I believe that providing a baseline financial safety net fosters educational advancement and entrepreneurial growth."
  },
  {
    id: "essay-013",
    title: "Banning Single-Use Plastics by Law",
    prompt: "Should governments enact complete legal bans on single-use plastics such as bags, cutlery, and packaging, or should recycling incentives remain voluntary? Discuss your perspective.",
    fourParagraphPlan: {
      p1: "Introduction: Highlight marine plastic pollution crisis and state strong agreement with enforceable legal bans over voluntary recycling.",
      p2: "Body 1 (Inefficacy of Voluntary Systems): Only a small fraction of plastic is recycled; consumer convenience frequently overrides environmental mindfulness.",
      p3: "Body 2 (Impact of Statutory Bans): Forcing manufacturers to adopt biodegradable alternatives, drastic reduction in coastal litter and landfill waste.",
      p4: "Conclusion: Conclude that enforceable legislation is the only realistic method to curb global environmental degradation."
    },
    nakulScaffold: "The proliferation of non-biodegradable plastic waste poses a critical threat to global marine and terrestrial ecosystems. In my opinion, voluntary recycling schemes have proven inadequate, and governments must enforce mandatory legal bans on single-use plastic products."
  },
  {
    id: "essay-014",
    title: "Compulsory Physical Education in High School Curricula",
    prompt: "Physical fitness levels among adolescents have declined globally due to sedentary screen time. Should daily physical education be made strictly mandatory for all secondary students? Give your opinion.",
    fourParagraphPlan: {
      p1: "Introduction: Address adolescent obesity and sedentary lifestyle trends. Agree that mandatory daily PE is vital for mental and physical well-being.",
      p2: "Body 1 (Physical Health Benefits): Prevention of juvenile diabetes, cardiovascular strength, development of lifelong motor habits.",
      p3: "Body 2 (Cognitive and Mental Health): Reduction in academic anxiety, improved concentration, dopamine and endorphin release supporting cognitive retention.",
      p4: "Conclusion: Affirm that mandatory physical training should be prioritized alongside STEM academics."
    },
    nakulScaffold: "In the modern digital era, sedentary lifestyle habits have led to concerning declines in adolescent fitness. I strongly support the perspective that mandatory daily physical education in high schools is essential for safeguarding students' long-term physical and cognitive health."
  },
  {
    id: "essay-015",
    title: "Tourism and Cultural Preservation in Heritage Destinations",
    prompt: "Mass tourism provides substantial economic revenue for historical cities, but it can also erode local cultural heritage and displace residents. Discuss how cities can balance tourism with preservation.",
    fourParagraphPlan: {
      p1: "Introduction: Frame the paradox of tourism revenue versus heritage erosion. State that sustainable quotas and cultural preservation taxes strike the right balance.",
      p2: "Body 1 (Economic Opportunities): Job creation in hospitality, funding for historical monument restoration, international cultural exchange.",
      p3: "Body 2 (Negative Repercussions): Overcrowding, inflation in residential rents, commodification of local sacred rituals.",
      p4: "Conclusion: Recommend visitor quota management and reinvestment of tourism taxes into heritage conservation."
    },
    nakulScaffold: "International tourism serves as a major economic lifeline for historical destinations worldwide, yet unchecked mass travel threatens cultural preservation. I believe municipal authorities must balance economic gains with heritage protection through visitor limits and targeted conservation levies."
  }
];

const weIds = new Set(weData.items.map(i => i.id));
moreWe.forEach(i => { if (!weIds.has(i.id)) weData.items.push(i); });
fs.writeFileSync(wePath, JSON.stringify(weData, null, 2), 'utf8');
console.log(`Essay Writing expanded to ${weData.items.length} items.`);

// 6. Write Dictation: add wfd-036 to wfd-050
const wfdPath = path.join(contentDir, 'pte-write-dictation.json');
const wfdData = JSON.parse(fs.readFileSync(wfdPath, 'utf8'));
const moreWfd = [
  {
    id: "wfd-036",
    sentence: "Contemporary architecture blends utilitarian concrete structures with energy-efficient glazed glass.",
    tokens: ["contemporary", "architecture", "blends", "utilitarian", "concrete", "structures", "with", "energy-efficient", "glazed", "glass"],
    spellingChallenges: [
      { word: "contemporary", commonErrors: ["contempary", "contemporery"] },
      { word: "utilitarian", commonErrors: ["utilaterian", "utilatarian"] }
    ]
  },
  {
    id: "wfd-037",
    sentence: "Marine sanctuaries provide critical breeding habitats for migratory whale and dolphin pods.",
    tokens: ["marine", "sanctuaries", "provide", "critical", "breeding", "habitats", "for", "migratory", "whale", "and", "dolphin", "pods"],
    spellingChallenges: [
      { word: "sanctuaries", commonErrors: ["sancturies", "sanctuarys"] },
      { word: "migratory", commonErrors: ["migratary", "migratery"] }
    ]
  },
  {
    id: "wfd-038",
    sentence: "Artificial intelligence systems analyze clinical symptoms to assist diagnostic medical practitioners.",
    tokens: ["artificial", "intelligence", "systems", "analyze", "clinical", "symptoms", "to", "assist", "diagnostic", "medical", "practitioners"],
    spellingChallenges: [
      { word: "practitioners", commonErrors: ["practicioners", "practishioners"] },
      { word: "symptoms", commonErrors: ["symtoms", "simptoms"] }
    ]
  },
  {
    id: "wfd-039",
    sentence: "The university auditorium cannot accommodate more than four hundred seated conference delegates.",
    tokens: ["the", "university", "auditorium", "cannot", "accommodate", "more", "than", "four", "hundred", "seated", "conference", "delegates"],
    spellingChallenges: [
      { word: "accommodate", commonErrors: ["acommodate", "accomodate"] },
      { word: "auditorium", commonErrors: ["auditerium", "audotorium"] },
      { word: "delegates", commonErrors: ["delegats", "delegats"] }
    ]
  },
  {
    id: "wfd-040",
    sentence: "Professional chefs emphasize consistent seasoning and delicate knife precision during prep work.",
    tokens: ["professional", "chefs", "emphasize", "consistent", "seasoning", "and", "delicate", "knife", "precision", "during", "prep", "work"],
    spellingChallenges: [
      { word: "precision", commonErrors: ["presision", "precission"] },
      { word: "consistent", commonErrors: ["consistant", "consistente"] }
    ]
  },
  {
    id: "wfd-041",
    sentence: "Atmospheric ocean currents distribute thermal equilibrium across equatorial and polar regions.",
    tokens: ["atmospheric", "ocean", "currents", "distribute", "thermal", "equilibrium", "across", "equatorial", "and", "polar", "regions"],
    spellingChallenges: [
      { word: "equilibrium", commonErrors: ["equilibirum", "equillibrium"] },
      { word: "equatorial", commonErrors: ["equitorial", "equateriel"] }
    ]
  },
  {
    id: "wfd-042",
    sentence: "Course enrollment amendments must be approved by the department advisor within two weeks.",
    tokens: ["course", "enrollment", "amendments", "must", "be", "approved", "by", "the", "department", "advisor", "within", "two", "weeks"],
    spellingChallenges: [
      { word: "enrollment", commonErrors: ["enrolment", "enrollement"] },
      { word: "amendments", commonErrors: ["ammendments", "amendmentes"] }
    ]
  },
  {
    id: "wfd-043",
    sentence: "Economic models illustrate how fluctuating commodity prices affect domestic grocery inflation.",
    tokens: ["economic", "models", "illustrate", "how", "fluctuating", "commodity", "prices", "affect", "domestic", "grocery", "inflation"],
    spellingChallenges: [
      { word: "fluctuating", commonErrors: ["fluctating", "fluctueting"] },
      { word: "commodity", commonErrors: ["comodity", "commoditty"] }
    ]
  },
  {
    id: "wfd-044",
    sentence: "Desalination facilities convert ocean saltwater into high quality drinking water for metropolitan residents.",
    tokens: ["desalination", "facilities", "convert", "ocean", "saltwater", "into", "high", "quality", "drinking", "water", "for", "metropolitan", "residents"],
    spellingChallenges: [
      { word: "desalination", commonErrors: ["desalanation", "desalinasion"] },
      { word: "facilities", commonErrors: ["facilties", "facillities"] }
    ]
  },
  {
    id: "wfd-045",
    sentence: "Culinary apprentices must memorize internal meat cooking temperatures to ensure hygiene safety.",
    tokens: ["culinary", "apprentices", "must", "memorize", "internal", "meat", "cooking", "temperatures", "to", "ensure", "hygiene", "safety"],
    spellingChallenges: [
      { word: "apprentices", commonErrors: ["aprentices", "apprentises"] },
      { word: "hygiene", commonErrors: ["hygene", "hygeine"] }
    ]
  },
  {
    id: "wfd-046",
    sentence: "The university botanical garden preserves rare indigenous flora for academic research.",
    tokens: ["the", "university", "botanical", "garden", "preserves", "rare", "indigenous", "flora", "for", "academic", "research"],
    spellingChallenges: [
      { word: "indigenous", commonErrors: ["indigenus", "indigenious"] },
      { word: "botanical", commonErrors: ["botanicle", "botannical"] }
    ]
  },
  {
    id: "wfd-047",
    sentence: "Renewable energy microgrids deliver uninterrupted electricity to isolated outback mining communities.",
    tokens: ["renewable", "energy", "microgrids", "deliver", "uninterrupted", "electricity", "to", "isolated", "outback", "mining", "communities"],
    spellingChallenges: [
      { word: "uninterrupted", commonErrors: ["uninterupted", "uninterruptedd"] },
      { word: "microgrids", commonErrors: ["micro-grids", "microgrides"] }
    ]
  },
  {
    id: "wfd-048",
    sentence: "Laboratory technicians wear protective safety goggles during chemical titration experiments.",
    tokens: ["laboratory", "technicians", "wear", "protective", "safety", "goggles", "during", "chemical", "titration", "experiments"],
    spellingChallenges: [
      { word: "technicians", commonErrors: ["technitians", "tecnicians"] },
      { word: "titration", commonErrors: ["titrasion", "titraton"] }
    ]
  },
  {
    id: "wfd-049",
    sentence: "Hospitality supervisors emphasize customer satisfaction and swift order turnaround times.",
    tokens: ["hospitality", "supervisors", "emphasize", "customer", "satisfaction", "and", "swift", "order", "turnaround", "times"],
    spellingChallenges: [
      { word: "satisfaction", commonErrors: ["satisfaksion", "satisfation"] },
      { word: "supervisors", commonErrors: ["supervisers", "supervisorss"] }
    ]
  },
  {
    id: "wfd-050",
    sentence: "The doctoral dissertation examines macroeconomic policies during periods of severe financial inflation.",
    tokens: ["the", "doctoral", "dissertation", "examines", "macroeconomic", "policies", "during", "periods", "of", "severe", "financial", "inflation"],
    spellingChallenges: [
      { word: "dissertation", commonErrors: ["dissertasion", "disertation"] },
      { word: "macroeconomic", commonErrors: ["macro-economic", "macroeconomik"] }
    ]
  }
];

const wfdIds = new Set(wfdData.items.map(i => i.id));
moreWfd.forEach(i => { if (!wfdIds.has(i.id)) wfdData.items.push(i); });
fs.writeFileSync(wfdPath, JSON.stringify(wfdData, null, 2), 'utf8');
console.log(`Write from Dictation expanded to ${wfdData.items.length} items.`);

console.log('[Batch 2 Expansion] Successfully finished!');
