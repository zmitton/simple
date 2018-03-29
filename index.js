const fs = require('fs');

const Compiler = require('./compiler');
const VM = require('./virtualMachine');

let vm, sMLFile, simpleFile, sMLFilepath, simpleFilepath
let command = process.argv[2]

simpleFilepath = "./" + process.argv[3].split(".s")[0] + ".s"
sMLFilepath = "./" + process.argv[3].split(".s")[0] + ".sml"

switch(command){
  case "compile": 
    simpleFile = fs.readFileSync(simpleFilepath, 'utf8')
    vm = new VM(new Compiler(simpleFile).compile())
    fs.writeFileSync(sMLFilepath, vm.print())
  case "execute":
    sMLFile = fs.readFileSync(sMLFilepath, 'utf8')
    vm = VM.fromSMLFile(sMLFile)
    vm.run()
    break
  default:
    console.log("MAIN COMMAND INVALID")
    break
}
