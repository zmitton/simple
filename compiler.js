const Expression = require('./expression')

const READ       = 10
const WRITE      = 11

const LOAD       = 20
const STORE      = 21

const ADD        = 30
const SUBTRACT   = 31
const DIVIDE     = 32
const MULTIPLY   = 33
const POW        = 34 //remove

const BRANCH     = 40
const BRANCHNEG  = 41
const BRANCHZERO = 42
const HALT       = 43


class Compiler{

  constructor(simpleFile){
    this.simpleFile = simpleFile
    this.symbolTable = new SymbolTable()
    this.memory = Array.from({length: 100}, (v, i) => 0)
    this.flags = Array.from({length: 100}, (v, i) => -1)
    this.memIndexHead = 0
    this.memIndexTail = 99
  }

  compile(){
    this.simpleFile = this.simpleFile.split("\n");
    if(this.simpleFile[this.simpleFile.length - 1].length == 0){
      this.simpleFile.pop()
    }

    this.firstPass()
    this.secondPass()
    return this.memory
  }

  firstPass(){
    for (var i = 0; i < this.simpleFile.length; i++) {
      this.proccessLine(this.simpleFile[i])
    }
  }

  secondPass(){
    for (var i = 0; i < this.flags.length; i++) {
      if(this.flags[i] != -1){
        this.memory[i] += this.symbolTable.find(this.flags[i], "L")
      }
    }
  }

  addMemoryInstruction(instruction, operandIndex){
    this.memory[this.memIndexHead] = (100 * instruction) + operandIndex
    return this.memIndexHead++
  }

  addMemoryOperand(operand, memoryIndex){
    this.memory[this.memIndexTail] = operand
    return this.memIndexTail--
  }

  proccessLine(line){
    let words, operandPtr, operandPtr2
    let operandType, postfixExpression, resultPtr

    words = line.split(' ')
    this.findOrInsert(parseInt(words[0]), "L")

    switch(words[1]){
      case 'rem': // done
        break
      case 'input': // done
        operandPtr = this.findOrInsert(words[2])
        this.addMemoryInstruction(READ, operandPtr)
        break
      case 'let': //done
        operandPtr = this.findOrInsert(words[2])
        postfixExpression = this.toPostfixExpression(words.slice(3, words.length))
        resultPtr = this.assembleExpression(postfixExpression)
        this.addMemoryInstruction(LOAD, resultPtr)
        this.addMemoryInstruction(STORE, operandPtr)
        break
      case 'print': // done
        postfixExpression = this.toPostfixExpression(words.slice(2, words.length))
        operandPtr = this.assembleExpression(postfixExpression)
        this.addMemoryInstruction(WRITE, operandPtr)
        break
      case 'goto': // done unchecked | requires 2nd pass
        this.flags[this.memIndexHead] = words[2]
        this.addMemoryInstruction(BRANCH, 0)
        break
      case 'if'://done totally utterly unchecked | requires 2nd pass
        //i.e. 01 if 5 + 7 == x + 2 goto 54
        let conditionalIndex = this.getConditionalIndex(words)

        postfixExpression = this.toPostfixExpression(words.slice(2, conditionalIndex))
        operandPtr = this.assembleExpression(postfixExpression)


        postfixExpression = this.toPostfixExpression(words.slice(conditionalIndex + 1, words.length - 2))
        // operandPtr2 = this.assembleExpression(postfixExpression)

        this.assembleConditional(
          operandPtr, 
          words[conditionalIndex], 
          this.assembleExpression(postfixExpression), 
          parseInt(words[words.length - 1] )
        )
        break
      case 'end': // done
        this.addMemoryInstruction(HALT, 0)
        break
      default:
        console.log("ERROR: " + words[1] + " is not a command")
        break
    }
  }

  getConditionalIndex(words){
    for (var i = 0; i < words.length; i++) {
      if(  words[i] == "=="
        || words[i] == ">"
        || words[i] == "<"
        || words[i] == "<="
        || words[i] == ">="
        ){
        return i
      }
    }
    console.log("ERROR: No condition in IF statement")
  }

  assembleConditional(operandPtr1, condition, operandPtr2, gotoLine){
    switch(condition){
      case "==":
        this.addMemoryInstruction(LOAD, operandPtr1)
        this.addMemoryInstruction(SUBTRACT, operandPtr2)
        this.flags[this.memIndexHead] = gotoLine
        this.addMemoryInstruction(BRANCHZERO, 0)
        break
      case "<":
        this.addMemoryInstruction(LOAD, operandPtr1)
        this.addMemoryInstruction(SUBTRACT, operandPtr2)
        this.flags[this.memIndexHead] = gotoLine
        this.addMemoryInstruction(BRANCHNEG, 0)
        break
      case "<=":
        this.addMemoryInstruction(LOAD, operandPtr1)
        this.addMemoryInstruction(SUBTRACT, operandPtr2)
        this.flags[this.memIndexHead] = gotoLine
        this.addMemoryInstruction(BRANCHNEG, 0)
        this.flags[this.memIndexHead] = gotoLine
        this.addMemoryInstruction(BRANCHZERO, 0)
        break
      case ">":
        this.addMemoryInstruction(LOAD, operandPtr2)
        this.addMemoryInstruction(SUBTRACT, operandPtr1)
        console.log(operandPtr1, operandPtr2)
        this.flags[this.memIndexHead] = gotoLine
        this.addMemoryInstruction(BRANCHNEG, 0)
        break
      case ">=":
        this.addMemoryInstruction(LOAD, operandPtr2)
        this.addMemoryInstruction(SUBTRACT, operandPtr1)
        this.flags[this.memIndexHead] = gotoLine
        this.addMemoryInstruction(BRANCHNEG, 0)
        this.flags[this.memIndexHead] = gotoLine
        this.addMemoryInstruction(BRANCHZERO, 0)
        break
      default:
        console.log("conditional issue ", operand1, condition, operand2)
        break
    }
  }

  assembleExpression(expression){
    let stack = []
    let operandPtr1, operandPtr2, result, currentElement, resultPtr

    while(expression.length > 0){
      currentElement = expression.shift()
      if(Expression.isOperand(currentElement)){
        stack.push(parseInt(currentElement));
      }else{//isOperator
        operandPtr2 = stack.pop();
        operandPtr1 = stack.pop();
        resultPtr = this.assemble(operandPtr1, operandPtr2, currentElement);
        stack.push(resultPtr);
      }
    }
  return stack.pop();
  }

  assemble(opLocation1, opLocation2, operator){
    let resultLocation = this.addMemoryOperand(0)
    // console.log("ASDF ", opLocation1, opLocation2, operator)
    switch(operator){
      case "+":
        this.addMemoryInstruction(LOAD, opLocation1)
        this.addMemoryInstruction(ADD, opLocation2)
        this.addMemoryInstruction(STORE, resultLocation)
        // return this.memory[opLocation1] + this.memory[opLocation2]
        break
      case "-":
        this.addMemoryInstruction(LOAD, opLocation1)
        this.addMemoryInstruction(SUBTRACT, opLocation2)
        this.addMemoryInstruction(STORE, resultLocation)
        // return this.memory[opLocation1] - this.memory[opLocation2]
        break
      case "*":
        this.addMemoryInstruction(LOAD, opLocation1)
        this.addMemoryInstruction(MULTIPLY, opLocation2)
        this.addMemoryInstruction(STORE, resultLocation)
        // return this.memory[opLocation1] * this.memory[opLocation2]
        break
      case "/":
        this.addMemoryInstruction(LOAD, opLocation1)
        this.addMemoryInstruction(DIVIDE, opLocation2)
        this.addMemoryInstruction(STORE, resultLocation)
        // return this.memory[opLocation1] / this.memory[opLocation2]
        break
      case "^":
        //sttub

        let tempInstructionPtr = this.memIndexHead
        this.addMemoryInstruction(LOAD, opLocation1) // base
        this.addMemoryInstruction(STORE, resultLocation) // base -> result

        this.addMemoryInstruction(MULTIPLY, opLocation2)
        this.addMemoryInstruction(STORE, resultLocation)



        this.addMemoryInstruction(LOAD, opLocation1)
        this.addMemoryInstruction(LOAD, opLocation2)
        this.addMemoryInstruction(POW, opLocation2)
        this.addMemoryInstruction(STORE, resultLocation)
        // let res = Math.pow(this.memory[opLocation1], this.memory[opLocation2])
        // this.memory[resultLocation] = res
        break
      default:
        console.log("ERROR: ", operator, " is not an operator")
    }
    return resultLocation
  }

  findOrInsert(symbol, type){
    let memoryLocation, value
    if(type == "L"){
      return this.symbolTable.findOrInsert(symbol, type, this.memIndexHead)
    }else{
      if(this.isNum(symbol)){ 
        type = "C"
        value = parseInt(symbol)
      }else{
        type = "V"
        value = 0
        symbol = symbol.charCodeAt(0) 
      }
      memoryLocation = this.symbolTable.find(symbol, type)
      if(!memoryLocation){
        memoryLocation = this.symbolTable.insert(symbol, type, this.memIndexTail)
        this.addMemoryOperand(value, memoryLocation)
      }
      return memoryLocation
    }
  }
  isNum(symbol){
    return parseInt(symbol) || symbol == 0
  }

  toPostfixExpression(words){
    let memLocation = null
    let infixItems = []

    for (var i = 0; i < words.length; i++) {
      if(Expression.isOperand(words[i])){
        memLocation = this.findOrInsert(words[i])
        infixItems.push(memLocation)
      }else{
        infixItems.push(words[i])
      }
    }
    return Expression.infixToPostfix(infixItems)
  }

  static getOperandType(str){
    if(!!parseInt(str)){
      return "C"
    }else{
      return "V"
    }
  }
}

class SymbolTable extends Array {
  constructor() {
    super()
  }

  findOrInsert(symbol, type, location){
    return this.find(symbol, type) || this.insert(symbol, type, location)
  }

  find(symbol, type){
    for (var i = 0; i < this.length; i++) {
      if(this[i].symbol == symbol && this[i].type == type){ 
        return this[i].location
      }
    }
    return null
  }

  insert(symbol, type, location){
    return this.push(new TableEntry(symbol, type, location)) // returns location
  }

  push(tableEntry){
    super.push(tableEntry)
    return tableEntry.location
  }
}


class TableEntry{
  constructor(symbol, type, location){
    this.symbol = symbol
    this.type = type
    this.location = location
  }
}


module.exports = Compiler
