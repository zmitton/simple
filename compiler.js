const READ       = 10
const WRITE      = 11
const LOAD       = 20
const STORE      = 21
const ADD        = 30
const SUBTRACT   = 31
const DIVIDE     = 32
const MULTIPLY   = 33
const BRANCH     = 40
const BRANCHNEG  = 41
const BRANCHZERO = 42
const HALT       = 43

const MEMSIZE = 100

class Compiler{

  constructor(simpleFile){
    this.simpleFile = simpleFile
    this.symbolTable = new SymbolTable()
    this.memory = Array.from({length: MEMSIZE}, (v, i) => 0)
    this.flags = Array.from({length: MEMSIZE}, (v, i) => -1)
    this.memIndexHead = 0
    this.memIndexTail = MEMSIZE - 1
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

  proccessLine(line){
    let words, operandPtr, operandPtr2
    let operandType, postfixExpression, resultPtr

    words = line.split(' ')
    this.findOrInsert(parseInt(words[0]), "L")

    switch(words[1]){
      case 'rem':
        break
      case 'input':
        operandPtr = this.findOrInsert(words[2])
        this.addMemoryInstruction(READ, operandPtr)
        break
      case 'let':
        operandPtr = this.findOrInsert(words[2])
        resultPtr = this.assembleFromInfix(words.slice(3, words.length))
        this.addMemoryInstruction(LOAD, resultPtr)
        this.addMemoryInstruction(STORE, operandPtr)
        break
      case 'print':
        resultPtr = this.assembleFromInfix(words.slice(2, words.length))
        this.addMemoryInstruction(WRITE, resultPtr)
        break
      case 'goto':
        this.flags[this.memIndexHead] = words[2]
        this.addMemoryInstruction(BRANCH, 0)
        break
      case 'if':
        let conditionalIndex = this.getConditionalIndex(words)
        resultPtr = this.assembleFromInfix(words.slice(2, conditionalIndex))
        let result2Ptr = this.assembleFromInfix(words.slice(conditionalIndex + 1, words.length - 2))
        this.assembleConditional(
          resultPtr, 
          words[conditionalIndex], 
          result2Ptr, 
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

  addMemoryInstruction(instruction, operandIndex){
    this.memory[this.memIndexHead] = (100 * instruction) + operandIndex
    return this.memIndexHead++
  }

  addMemoryOperand(operand, memoryIndex){
    this.memory[this.memIndexTail] = operand
    return this.memIndexTail--
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

  assembleFromPostfix(expression){
    let stack = []
    let operandPtr1, operandPtr2, result, currentElement, resultPtr

    while(expression.length > 0){
      currentElement = expression.shift()
      if(Compiler.isOperand(currentElement)){
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

    this.addMemoryInstruction(LOAD, opLocation1)
    switch(operator){
      case "+":
        this.addMemoryInstruction(ADD, opLocation2)
        break
      case "-":
        this.addMemoryInstruction(SUBTRACT, opLocation2)
        break
      case "*":
        this.addMemoryInstruction(MULTIPLY, opLocation2)
        break
      case "/":
        this.addMemoryInstruction(DIVIDE, opLocation2)
        break
      default:
        console.log("ERROR: ", operator, " is not an operator")
    }

    this.addMemoryInstruction(STORE, resultLocation)
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

  assembleFromInfix(words){
    let memLocation = null
    let infix = []

    for (var i = 0; i < words.length; i++) {
      if(Compiler.isOperand(words[i])){
        memLocation = this.findOrInsert(words[i])
        infix.push(memLocation)
      }else{
        infix.push(words[i])
      }
    }
    let postfix = Compiler.infixToPostfix(infix)

    return this.assembleFromPostfix(postfix)
  }

  static infixToPostfix(input){
    let stack = []
    let queue = []

    input.forEach((currentValue)=>{
      if(Compiler.isOperand(currentValue)){
        queue.push(currentValue)
      }else if(currentValue == '('){
        stack.push(currentValue);
      }else if(currentValue == ')'){
        while(stack[stack.length-1] != '('){
          queue.push(stack.pop());
        }
        stack.pop()
      }else{
        while(stack.length > 0 
          && stack[stack.length-1] != '(' 
          && this.getPrecedence(stack[stack.length-1]) >= this.getPrecedence(currentValue))
        {
          queue.push(stack.pop());
        }
        stack.push(currentValue);
      }
    })

    while(stack.length > 0){ 
      queue.push(stack.pop())
    }
    return queue;
  }

  static getOperandType(str){
    return !!parseInt(str) ? "C" : "V"
  }

  static isOperand(input){
    return (input != '+') 
      && (input != '-')
      && (input != '*')
      && (input != '/')
      && (input != '^')
      && (input != '(')
      && (input != ')')
  }
  static getPrecedence(operator){
    if(operator == '+'){ return 0 }
    if(operator == '-'){ return 0 }
    if(operator == '*'){ return 1 }
    if(operator == '/'){ return 1 }
    if(operator == '^'){ return 2 }

    console.log("Error : '%c'\n", operator);
  }
}

class SymbolTable extends Array {
  constructor() { super() }

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
