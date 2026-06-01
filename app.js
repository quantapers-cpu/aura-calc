/**
 * AuraCalc - Premium Calculator Application Logic
 * Implements token-based parsing (Shunting-Yard), local storage persistence,
 * UI themes, sound feedback, calculations history, and responsive behaviors.
 */

document.addEventListener('DOMContentLoaded', () => {
    // App State
    let currentInput = '0';
    let expression = []; // Stores tokens: numbers and operators
    let isEvaluated = false;
    
    // Preferences (loaded from localStorage or defaults)
    let soundEnabled = localStorage.getItem('auraCalc_sound') !== 'false';
    let isDarkTheme = localStorage.getItem('auraCalc_theme') !== 'light';
    let isScientific = localStorage.getItem('auraCalc_scientific') === 'true';
    let history = JSON.parse(localStorage.getItem('auraCalc_history')) || [];

    // DOM Elements
    const appContainer = document.getElementById('app-container');
    const inputDisplay = document.getElementById('input-display');
    const expressionDisplay = document.getElementById('expression-display');
    
    const btnTheme = document.getElementById('btn-theme');
    const iconSun = btnTheme.querySelector('.theme-sun');
    const iconMoon = btnTheme.querySelector('.theme-moon');
    
    const btnSound = document.getElementById('btn-sound');
    const iconSoundOn = btnSound.querySelector('.sound-on');
    const iconSoundOff = btnSound.querySelector('.sound-off');
    
    const btnHistoryToggle = document.getElementById('btn-history-toggle');
    const btnClearHistory = document.getElementById('btn-clear-history');
    const historyPanel = document.getElementById('history-panel');
    const historyList = document.getElementById('history-list');
    
    const btnCopy = document.getElementById('btn-copy');
    const copyTooltip = btnCopy.querySelector('.copy-tooltip');
    
    const modeStd = document.getElementById('mode-std');
    const modeAdv = document.getElementById('mode-adv');
    const keypadAdv = document.getElementById('keypad-adv');

    // Create history overlay dynamically for mobile layout
    const historyOverlay = document.createElement('div');
    historyOverlay.className = 'history-overlay';
    historyOverlay.id = 'history-overlay';
    document.body.appendChild(historyOverlay);

    // Initial Setup
    initPreferences();
    renderDisplay();
    renderHistory();

    // ==========================================================================
    // Initialization & UI Theme Functions
    // ==========================================================================
    function initPreferences() {
        // Theme Setup
        if (isDarkTheme) {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
            iconSun.classList.add('hidden');
            iconMoon.classList.remove('hidden');
        } else {
            document.body.classList.add('light-theme');
            document.body.classList.remove('dark-theme');
            iconSun.classList.remove('hidden');
            iconMoon.classList.add('hidden');
        }

        // Sound Setup
        if (soundEnabled) {
            iconSoundOn.classList.remove('hidden');
            iconSoundOff.classList.add('hidden');
        } else {
            iconSoundOn.classList.add('hidden');
            iconSoundOff.classList.remove('hidden');
        }

        // Mode Setup
        if (isScientific) {
            modeAdv.classList.add('active');
            modeStd.classList.remove('active');
            keypadAdv.classList.remove('hidden-keypad');
        } else {
            modeStd.classList.add('active');
            modeAdv.classList.remove('active');
            keypadAdv.classList.add('hidden-keypad');
        }
    }

    function toggleTheme() {
        playClickSound();
        isDarkTheme = !isDarkTheme;
        localStorage.setItem('auraCalc_theme', isDarkTheme ? 'dark' : 'light');
        initPreferences();
    }

    function toggleSound() {
        soundEnabled = !soundEnabled;
        localStorage.setItem('auraCalc_sound', soundEnabled ? 'true' : 'false');
        initPreferences();
        playClickSound();
    }

    function toggleScientificMode(mode) {
        playClickSound();
        isScientific = (mode === 'adv');
        localStorage.setItem('auraCalc_scientific', isScientific ? 'true' : 'false');
        initPreferences();
    }

    // ==========================================================================
    // Web Audio Synthesized Click Feedback
    // ==========================================================================
    function playClickSound() {
        if (!soundEnabled) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContextClass();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            // Short sine wave click transitioning from high to low frequency
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);
            
            gainNode.gain.setValueAtTime(0.04, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.04);
        } catch (e) {
            console.warn('Audio Context failed to load or start:', e);
        }
    }

    // ==========================================================================
    // History Panel Drawer Operations
    // ==========================================================================
    function toggleHistoryPanel() {
        playClickSound();
        const isOpen = historyPanel.classList.toggle('open');
        historyOverlay.classList.toggle('show', isOpen);
        
        // On desktop, add/remove styling grid shift
        if (window.innerWidth >= 768) {
            appContainer.classList.toggle('history-active', isOpen);
        }
    }

    function closeHistoryPanel() {
        historyPanel.classList.remove('open');
        historyOverlay.classList.remove('show');
        appContainer.classList.remove('history-active');
    }

    // Adds item to local history list
    function addHistoryItem(exprStr, resStr) {
        // Keep history limited to 50 items
        history.unshift({ expr: exprStr, res: resStr });
        if (history.length > 50) history.pop();
        
        localStorage.setItem('auraCalc_history', JSON.stringify(history));
        renderHistory();
    }

    function clearHistory() {
        playClickSound();
        history = [];
        localStorage.removeItem('auraCalc_history');
        renderHistory();
    }

    function renderHistory() {
        if (history.length === 0) {
            historyList.innerHTML = '<li class="history-empty">No calculations yet</li>';
            return;
        }

        historyList.innerHTML = history.map((item, idx) => `
            <li class="history-item" data-index="${idx}">
                <span class="history-item-exp">${item.expr}</span>
                <span class="history-item-res">${item.res}</span>
            </li>
        `).join('');
    }

    function handleHistoryItemClick(e) {
        const item = e.target.closest('.history-item');
        if (!item) return;

        playClickSound();
        const idx = parseInt(item.getAttribute('data-index'), 10);
        const selected = history[idx];

        // Load the result of this calculation as the current input
        currentInput = selected.res;
        expression = [];
        isEvaluated = true;
        renderDisplay();
        
        // Close history drawer on mobile screen widths
        if (window.innerWidth < 768) {
            closeHistoryPanel();
        }
    }

    // ==========================================================================
    // Copy To Clipboard
    // ==========================================================================
    function copyResultToClipboard() {
        playClickSound();
        const textToCopy = currentInput;
        navigator.clipboard.writeText(textToCopy).then(() => {
            copyTooltip.classList.add('show');
            setTimeout(() => {
                copyTooltip.classList.remove('show');
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }

    // ==========================================================================
    // Display Rendering Logic
    // ==========================================================================
    function renderDisplay() {
        // Dynamic scale down for long numbers to prevent text clipping
        const charCount = currentInput.length;
        if (charCount > 15) {
            inputDisplay.style.fontSize = '1.4rem';
        } else if (charCount > 10) {
            inputDisplay.style.fontSize = '1.8rem';
        } else {
            inputDisplay.style.fontSize = '2.5rem';
        }

        // Format commas for readability
        let formattedInput = currentInput;
        if (currentInput !== 'Error' && currentInput !== 'NaN' && currentInput !== 'Infinity') {
            formattedInput = formatNumberWithCommas(currentInput);
        }
        
        inputDisplay.textContent = formattedInput;
        expressionDisplay.textContent = formatExpressionDisplay(expression);
        
        // Auto-scroll displays to the right when they exceed margins
        inputDisplay.scrollLeft = inputDisplay.scrollWidth;
        expressionDisplay.parentElement.scrollLeft = expressionDisplay.parentElement.scrollWidth;
    }

    // Adds thousand separation commas while preserving typing state (e.g. trailing dot)
    function formatNumberWithCommas(numStr) {
        if (numStr.includes('e')) return numStr; // Avoid breaking scientific notation
        
        const parts = numStr.split('.');
        const integerPart = parts[0];
        const decimalPart = parts.length > 1 ? '.' + parts[1] : '';

        // Formats commas using regex
        const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return formattedInteger + decimalPart;
    }

    // Maps code operation tokens to clean mathematical UI symbols
    function formatExpressionDisplay(exprArr) {
        return exprArr.map(token => {
            if (token === 'add') return ' + ';
            if (token === 'sub') return ' − ';
            if (token === 'mul') return ' × ';
            if (token === 'div') return ' ÷ ';
            if (token === 'pow') return ' ^ ';
            return token;
        }).join('');
    }

    // ==========================================================================
    // Calculator Operations Engine
    // ==========================================================================
    
    // Core digit handling
    function handleDigit(digit) {
        if (isEvaluated) {
            currentInput = digit;
            expression = [];
            isEvaluated = false;
        } else {
            if (currentInput === '0') {
                currentInput = digit;
            } else if (currentInput === '-0') {
                currentInput = '-' + digit;
            } else {
                currentInput += digit;
            }
        }
        renderDisplay();
    }

    // Decimal Point handling
    function handleDecimal() {
        if (isEvaluated) {
            currentInput = '0.';
            expression = [];
            isEvaluated = false;
            renderDisplay();
            return;
        }

        // Block double decimals in current token
        if (currentInput.includes('.')) return;
        
        currentInput += '.';
        renderDisplay();
    }

    // Backspace handling
    function handleBackspace() {
        if (isEvaluated) {
            expression = [];
            isEvaluated = false;
            renderDisplay();
            return;
        }

        if (currentInput === 'Error' || currentInput === 'NaN' || currentInput === 'Infinity') {
            currentInput = '0';
        } else if (currentInput.length > 1) {
            currentInput = currentInput.slice(0, -1);
            if (currentInput === '-' || currentInput === '-0') {
                currentInput = '0';
            }
        } else {
            currentInput = '0';
        }
        renderDisplay();
    }

    // Clear operation
    function handleClear() {
        currentInput = '0';
        expression = [];
        isEvaluated = false;
        renderDisplay();
    }

    // Operator selection (+, -, *, /, ^)
    function handleOperator(op) {
        if (currentInput === 'Error') return;

        // If evaluated, start new expression using the result
        if (isEvaluated) {
            expression = [currentInput, op];
            currentInput = '';
            isEvaluated = false;
            renderDisplay();
            return;
        }

        // If expression has an operator and currentInput is empty, allow changing the operator
        if (currentInput === '' && expression.length > 0) {
            const lastToken = expression[expression.length - 1];
            if (isOperatorToken(lastToken)) {
                expression[expression.length - 1] = op;
                renderDisplay();
                return;
            }
        }

        // Push current value and operator
        const valToPush = currentInput === '' ? '0' : currentInput;
        
        // Remove trailing decimal point if exists
        const formattedVal = valToPush.endsWith('.') ? valToPush.slice(0, -1) : valToPush;
        
        expression.push(formattedVal);
        expression.push(op);
        currentInput = '';
        renderDisplay();
    }

    function isOperatorToken(token) {
        return ['add', 'sub', 'mul', 'div', 'pow'].includes(token);
    }

    // Unary Operators (sin, cos, tan, sqrt, fact, log, ln, percent, negate, pow2)
    function handleUnary(op) {
        if (currentInput === 'Error') return;

        let num = parseFloat(currentInput);
        if (isNaN(num)) return;

        let result;
        let actionLabel = '';

        switch (op) {
            case 'negate':
                if (currentInput === '0') return;
                if (currentInput.startsWith('-')) {
                    currentInput = currentInput.substring(1);
                } else {
                    currentInput = '-' + currentInput;
                }
                renderDisplay();
                return; // Direct update, bypasses evaluation labels
            case 'percent':
                result = num / 100;
                break;
            case 'sin':
                result = Math.sin(num);
                actionLabel = `sin(${currentInput})`;
                break;
            case 'cos':
                result = Math.cos(num);
                actionLabel = `cos(${currentInput})`;
                break;
            case 'tan':
                result = Math.tan(num);
                actionLabel = `tan(${currentInput})`;
                break;
            case 'sqrt':
                result = Math.sqrt(num);
                actionLabel = `√(${currentInput})`;
                break;
            case 'log':
                result = Math.log10(num);
                actionLabel = `log(${currentInput})`;
                break;
            case 'ln':
                result = Math.log(num);
                actionLabel = `ln(${currentInput})`;
                break;
            case 'pow2':
                result = num * num;
                actionLabel = `${currentInput}²`;
                break;
            case 'fact':
                result = factorial(num);
                actionLabel = `${currentInput}!`;
                break;
            default:
                return;
        }

        // Formats outputs cleanly
        currentInput = formatResult(result);
        
        // If part of expression, show the visual calculation trace on display
        if (actionLabel) {
            // E.g. replace expression with action labels or display it on expression line
            expressionDisplay.textContent = actionLabel;
        }
        
        isEvaluated = false;
        renderDisplay();
    }

    // Constants handler (pi, e)
    function handleConstant(constant) {
        if (isEvaluated) {
            expression = [];
            isEvaluated = false;
        }
        
        if (constant === 'pi') {
            currentInput = formatResult(Math.PI);
        } else if (constant === 'e') {
            currentInput = formatResult(Math.E);
        }
        renderDisplay();
    }

    // EXP input handler for scientific E notation
    function handleExp() {
        if (isEvaluated) {
            currentInput = '0';
            expression = [];
            isEvaluated = false;
        }

        if (currentInput.includes('e')) return; // Avoid multiple exponents
        currentInput += 'e';
        renderDisplay();
    }

    function factorial(n) {
        if (n < 0) return NaN;
        if (n === 0 || n === 1) return 1;
        if (!Number.isInteger(n)) return NaN; // Only integer factorials
        if (n > 170) return Infinity; // Prevent overflow beyond double floats
        let result = 1;
        for (let i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    }

    // Main Equal button handler
    function handleEqual() {
        if (expression.length === 0) return; // Nothing to calculate
        if (currentInput === 'Error') return;

        // If last element is operator and currentInput is empty, strip trailing operator
        if (currentInput === '') {
            const lastToken = expression[expression.length - 1];
            if (isOperatorToken(lastToken)) {
                expression.pop();
            }
        } else {
            expression.push(currentInput.endsWith('.') ? currentInput.slice(0, -1) : currentInput);
        }

        if (expression.length === 0) {
            currentInput = '0';
            renderDisplay();
            return;
        }

        const fullExprStr = formatExpressionDisplay(expression);
        const result = evaluateExpression(expression);
        
        const finalFormattedResult = formatResult(result);
        
        // Push to history
        addHistoryItem(fullExprStr + ' =', finalFormattedResult);

        // Update display states
        currentInput = finalFormattedResult;
        expression = [];
        isEvaluated = true;
        renderDisplay();
    }

    // Formats numbers cleanly to avoid floating point weirdness (e.g. 0.1 + 0.2)
    function formatResult(value) {
        if (isNaN(value)) return 'Error';
        if (!isFinite(value)) return 'Error';
        
        // Standard Javascript string conversions
        const strVal = value.toString();
        
        // Check for float issues. Keep max precision of 12 decimal places
        if (strVal.includes('.') && !strVal.includes('e')) {
            const fixed = parseFloat(value.toFixed(12));
            return fixed.toString();
        }
        
        // Truncate overly long values
        if (strVal.length > 18) {
            return value.toExponential(10);
        }

        return strVal;
    }

    // ==========================================================================
    // Parser Engine (Shunting-Yard Infix -> Postfix Evaluator)
    // ==========================================================================
    function evaluateExpression(exprTokens) {
        const postfix = infixToPostfix(exprTokens);
        if (!postfix) return NaN;
        return evaluatePostfix(postfix);
    }

    // Converts standard operations infix to postfix notation
    function infixToPostfix(tokens) {
        const outputQueue = [];
        const operatorStack = [];
        
        const precedence = {
            'add': 1,
            'sub': 1,
            'mul': 2,
            'div': 2,
            'pow': 3
        };

        const associativity = {
            'add': 'L',
            'sub': 'L',
            'mul': 'L',
            'div': 'L',
            'pow': 'R'
        };

        for (const token of tokens) {
            if (!isNaN(parseFloat(token)) || token === 'Error') {
                // If it's a number, push to queue
                outputQueue.push(parseFloat(token));
            } else if (['add', 'sub', 'mul', 'div', 'pow'].includes(token)) {
                // If operator, handle precedence rules
                let o1 = token;
                let o2 = operatorStack[operatorStack.length - 1];
                
                while (
                    o2 && 
                    ['add', 'sub', 'mul', 'div', 'pow'].includes(o2) &&
                    ((associativity[o1] === 'L' && precedence[o1] <= precedence[o2]) ||
                     (associativity[o1] === 'R' && precedence[o1] < precedence[o2]))
                ) {
                    outputQueue.push(operatorStack.pop());
                    o2 = operatorStack[operatorStack.length - 1];
                }
                operatorStack.push(o1);
            } else {
                return null; // Invalid token error
            }
        }

        while (operatorStack.length > 0) {
            outputQueue.push(operatorStack.pop());
        }

        return outputQueue;
    }

    // Evaluates the postfix output
    function evaluatePostfix(postfixArr) {
        const stack = [];
        
        for (const token of postfixArr) {
            if (typeof token === 'number') {
                stack.push(token);
            } else {
                const b = stack.pop();
                const a = stack.pop();
                
                if (a === undefined || b === undefined) return NaN;

                let res;
                switch (token) {
                    case 'add': res = a + b; break;
                    case 'sub': res = a - b; break;
                    case 'mul': res = a * b; break;
                    case 'div': 
                        if (b === 0) return NaN; // Division by zero check
                        res = a / b; 
                        break;
                    case 'pow': res = Math.pow(a, b); break;
                    default: return NaN;
                }
                stack.push(res);
            }
        }

        if (stack.length !== 1) return NaN;
        return stack[0];
    }

    // ==========================================================================
    // Event Listeners Mapping
    // ==========================================================================

    // Click mappings for standard/scientific key buttons
    document.querySelectorAll('.key').forEach(button => {
        button.addEventListener('click', () => {
            playClickSound();
            const val = button.getAttribute('data-val');
            
            if (!val) return;

            if (button.classList.contains('btn-num')) {
                handleDigit(val);
            } else if (button.classList.contains('btn-operator')) {
                handleOperator(val);
            } else if (button.classList.contains('btn-sci')) {
                if (val === 'pi' || val === 'e') {
                    handleConstant(val);
                } else if (val === 'exp') {
                    handleExp();
                } else {
                    handleUnary(val);
                }
            } else {
                // Util keys
                switch (val) {
                    case 'clear':
                        handleClear();
                        break;
                    case 'backspace':
                        handleBackspace();
                        break;
                    case 'percent':
                        handleUnary('percent');
                        break;
                    case 'negate':
                        handleUnary('negate');
                        break;
                    case 'decimal':
                        handleDecimal();
                        break;
                    case 'equal':
                        handleEqual();
                        break;
                }
            }
        });
    });

    // Control buttons listeners
    btnTheme.addEventListener('click', toggleTheme);
    btnSound.addEventListener('click', toggleSound);
    btnHistoryToggle.addEventListener('click', toggleHistoryPanel);
    historyOverlay.addEventListener('click', closeHistoryPanel);
    btnClearHistory.addEventListener('click', clearHistory);
    historyList.addEventListener('click', handleHistoryItemClick);
    btnCopy.addEventListener('click', copyResultToClipboard);

    // Switch calculator modes
    modeStd.addEventListener('click', () => toggleScientificMode('std'));
    modeAdv.addEventListener('click', () => toggleScientificMode('adv'));

    // Keyboard support bindings
    window.addEventListener('keydown', (e) => {
        const key = e.key;

        // Prevent space bar scrolling if user taps space
        if (key === ' ') {
            e.preventDefault();
            return;
        }

        if (/[0-9]/.test(key)) {
            playClickSound();
            handleDigit(key);
        } else if (key === '.') {
            playClickSound();
            handleDecimal();
        } else if (key === '+' || key === '-' || key === '*' || key === '/' || key === '^') {
            playClickSound();
            let op = '';
            if (key === '+') op = 'add';
            if (key === '-') op = 'sub';
            if (key === '*') op = 'mul';
            if (key === '/') op = 'div';
            if (key === '^') op = 'pow';
            handleOperator(op);
        } else if (key === 'Enter' || key === '=') {
            e.preventDefault();
            playClickSound();
            handleEqual();
        } else if (key === 'Backspace') {
            playClickSound();
            handleBackspace();
        } else if (key === 'Escape') {
            playClickSound();
            handleClear();
        } else if (key === '%') {
            playClickSound();
            handleUnary('percent');
        }
    });

    // Handle screen resize, close desktop shifts on narrow displays
    window.addEventListener('resize', () => {
        if (window.innerWidth < 768) {
            if (appContainer.classList.contains('history-active')) {
                appContainer.classList.remove('history-active');
                historyPanel.classList.add('open');
                historyOverlay.classList.add('show');
            }
        } else {
            if (historyPanel.classList.contains('open')) {
                appContainer.classList.add('history-active');
                historyOverlay.classList.remove('show');
            }
        }
    });
});
