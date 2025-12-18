class DraggableController {
    constructor(element) {
        this.draggableControls = element;
        this.isDragging = false;
        this.offset = { x: 0, y: 0 };
        this.currentX = 0;
        this.currentY = 0;
        this.DRAG_THRESHOLD = 5;
        this.animationFrameId = null; // Controle da animação

        this.onDragStart = this.onDragStart.bind(this);
        this.onDragMove = this.onDragMove.bind(this);
        this.onDragEnd = this.onDragEnd.bind(this);
        this.updatePosition = this.updatePosition.bind(this);

        this.setupListeners();
    }

    setupStyles() {
        if (!this.isSetup) {
            const rect = this.draggableControls.getBoundingClientRect();

            this.draggableControls.style.left = `${rect.left}px`;
            this.draggableControls.style.top = `${rect.top}px`;

            this.isSetup = true;
        }
    }

    setupListeners() {
        this.draggableControls.addEventListener('mousedown', this.onDragStart);
        this.draggableControls.addEventListener('touchstart', this.onDragStart);
    }

    onDragStart(event) {
        if (!this.draggableControls.classList.contains('draggable')) {
            return;
        }

        this.isDragging = false;
        this.setupStyles();

        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;

        // Cache inicial das posições
        const currentLeft = parseFloat(this.draggableControls.style.left) || 0;
        const currentTop = parseFloat(this.draggableControls.style.top) || 0;

        this.offset.x = clientX - currentLeft;
        this.offset.y = clientY - currentTop;
        this.startX = clientX;
        this.startY = clientY;

        document.addEventListener('mousemove', this.onDragMove, { passive: false });
        document.addEventListener('mouseup', this.onDragEnd);
        document.addEventListener('touchmove', this.onDragMove, { passive: false });
        document.addEventListener('touchend', this.onDragEnd);
    }

    onDragMove(event) {
        event.preventDefault();

        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;

        if (!this.isDragging) {
            const dx = Math.abs(clientX - this.startX);
            const dy = Math.abs(clientY - this.startY);
            if (dx > this.DRAG_THRESHOLD || dy > this.DRAG_THRESHOLD) {
                this.isDragging = true;
                this.draggableControls.classList.add('dragging');
            } else {
                return;
            }
        }

        this.currentX = clientX - this.offset.x;
        this.currentY = clientY - this.offset.y;

        // Solicita o frame de animação se não houver um pendente
        if (!this.animationFrameId) {
            this.animationFrameId = requestAnimationFrame(this.updatePosition);
        }
    }

    updatePosition() {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const elementWidth = this.draggableControls.offsetWidth;
        const elementHeight = this.draggableControls.offsetHeight;

        const newX = Math.max(0, Math.min(this.currentX, viewportWidth - elementWidth));
        const newY = Math.max(0, Math.min(this.currentY, viewportHeight - elementHeight));

        this.draggableControls.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
        // Nota: Mudei para transform/translate3d para melhor performance de GPU
        // Se precisar manter left/top por compatibilidade com o resto do app:
        this.draggableControls.style.left = `${newX}px`;
        this.draggableControls.style.top = `${newY}px`;
        this.draggableControls.style.transform = 'none';

        this.animationFrameId = null;
    }

    onDragEnd(event) {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        document.removeEventListener('mousemove', this.onDragMove);
        document.removeEventListener('mouseup', this.onDragEnd);
        document.removeEventListener('touchmove', this.onDragMove);
        document.removeEventListener('touchend', this.onDragEnd);

        if (this.isDragging) {
            this.draggableControls.classList.remove('dragging');
        }
        this.isDragging = false;
    }
}