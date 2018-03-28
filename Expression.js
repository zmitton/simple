class Expression{
  constructor(){
    this.postfixItems = []
    this.infixItems = []
  }

  static tokenize(str){
    let infix = str.split(" ")
    infix.forEach(function(elem) {
      this.infixItems.push(parseInt(elem))
    })
    return new Expression()
  }

  static infixToPostfix(input){
    let stack = []
    let queue = []

    input.forEach((currentValue)=>{
      if(Expression.isOperand(currentValue)){
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

module.exports = Expression
