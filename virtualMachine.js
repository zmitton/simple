const rls = require('readline-sync');

const READ       = 10
const WRITE      = 11
const LOAD       = 20
const STORE      = 21
const ADD        = 30
const SUBTRACT   = 31
const DIVIDE     = 32
const MULTIPLY   = 33
const POW        = 34
const BRANCH     = 40
const BRANCHNEG  = 41
const BRANCHZERO = 42
const HALT       = 43

class VM{
  constructor(memory){
    this.memory = memory
    this.instructionCounter = 0
    this.accumulator = 0
    this.instructionRegister = 0
    this.operationCode = 0
    this.operand = 0
  }

  static getOperationCode(full){ return Math.floor(full / 100); }

  static getOperand(full){ return full % 100; }

  static fromSMLFile(smlFile){
    let vm = new VM([])
    let smlLines = smlFile.split("\n");

    if(smlLines[smlLines.length - 1].length == 0){ smlLines.pop() }
    for (var i = 0; i < smlLines.length; i++) {
      if(smlLines[smlLines.length - 1].length != 0){
        vm.memory.push(parseInt(smlLines[i]))
      }
    }
    return vm
  }


  print(){
    let str = ""
    this.memory.forEach((elem)=>{
      if(elem == 0){ elem = "0000" }
      str += elem.toString() + "\n"
    })
    return str
  }

  run(){
    let memLength = this.memory.length
    while(this.instructionCounter < memLength){
      this.operate();
    }
  }

  operate(){
    this.instructionRegister = this.memory[this.instructionCounter];
    this.operationCode = VM.getOperationCode(this.instructionRegister);
    this.operand = VM.getOperand(this.instructionRegister);

    switch(this.operationCode) {
      case READ :
        this.memory[this.operand] = parseInt(rls.question("? "))
        this.instructionCounter++
        break
      case WRITE :
        console.log(this.memory[this.operand]);
        this.instructionCounter++;
        break
      case LOAD :
        this.accumulator = this.memory[this.operand];
        this.instructionCounter++;
        break
      case STORE :
        this.memory[this.operand] = this.accumulator;
        this.instructionCounter++;
        break
      case ADD :
        this.accumulator = this.accumulator + this.memory[this.operand];
        this.instructionCounter++;
        break
      case SUBTRACT :
        this.accumulator = this.accumulator - this.memory[this.operand];
        this.instructionCounter++;
        break
      case DIVIDE :
        if(this.accumulator == 0 ){
          console.log("Terminated: Attempt to divide by zero");
          this.instructionCounter = 100;
        }else{
          this.accumulator = this.accumulator / this.memory[this.operand];
          this.instructionCounter++;
        }
        break
      case MULTIPLY :
        this.accumulator = this.memory[this.operand] * this.accumulator;
        this.instructionCounter++;
        break
      case BRANCH :
        this.instructionCounter = this.operand
        break
      case BRANCHNEG :
        if(this.accumulator < 0){
          this.instructionCounter = this.operand
        }else{
          this.instructionCounter++;
        }
        break
      case BRANCHZERO :
        if(this.accumulator == 0){
          this.instructionCounter = this.operand
        }else{
          this.instructionCounter++
        }
        break
      case HALT :
        this.instructionCounter = 100
        break
      default:
        console.log("INVALID operationCode: '%d'", this.operationCode)
        this.instructionCounter = 100
        break
    }
    return;
  }
}

module.exports = VM
