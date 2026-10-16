export type Topic = { id: string; title: string; angle: string; platform: string; format: string; decision: "pending" | "approved" | "cut" | "revise"; note?: string };
export const accounts = [
  { name:"Marker Group", color:"#46796C", health:"On track", package:"Essential", due:"Thu, 16 Oct", waiting:2 },
  { name:"House Build", color:"#B7864B", health:"Needs review", package:"Custom", due:"Fri, 17 Oct", waiting:1 },
  { name:"Buildreg", color:"#5376B4", health:"On track", package:"Essential", due:"Thu, 16 Oct", waiting:0 },
  { name:"Element", color:"#7C6AA6", health:"Onboarding", package:"Growth", due:"—", waiting:0 },
  { name:"EnergyFix", color:"#5E8D55", health:"Onboarding", package:"Essential", due:"—", waiting:0 },
  { name:"CapCon", color:"#A76C64", health:"Prospect", package:"Growth", due:"—", waiting:0 },
];
export const initialTopics: Topic[] = [
  { id:"t1", title:"The hidden cost of a delayed fire door inspection", angle:"A practical breakdown of the knock-on costs when routine inspections slip, with a checklist for facilities teams.", platform:"LinkedIn", format:"Carousel", decision:"pending" },
  { id:"t2", title:"Building control: what changed this quarter?", angle:"Translate the latest guidance into three actions project teams can take this week.", platform:"LinkedIn", format:"Single image", decision:"pending" },
  { id:"t3", title:"Meet the people behind the projects", angle:"A short team spotlight featuring the technical support team and how they help clients.", platform:"Instagram", format:"Reel", decision:"pending" },
];
export const columns = ["Planned","In production","Internal review","Changes requested","Client review","Approved","Scheduled","Posted"];
