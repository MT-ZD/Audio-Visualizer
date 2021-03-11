<script lang="ts">
    import { onMount } from 'svelte';

    export let volumes: Uint8Array;

    let canvasWidth = 1000;
    let canvasHeight = 1000;

    let canvas: HTMLCanvasElement;
    let context: CanvasRenderingContext2D;

    function avg(array: Uint8Array, start: number, end: number) {
        let sum = 0;

        array.slice(start, end).forEach((num) => (sum += num));

        return sum / (end - start);
    }

    $: volumesLength = volumes.length;

    $: spacing = (avg(volumes, 0, volumesLength) * 40) / 255;
    $: bassOffset = (avg(volumes, 0, 20) * 30) / 255 - 15;
    $: trebbleOffset = (avg(volumes, volumesLength / 1.2, volumesLength / 1.5) * 30) / 255 - 15;
    $: halfWidth = canvasWidth / 2 + trebbleOffset;
    $: halfHeight = canvasHeight / 2 + bassOffset;
    $: shorterSideLength = canvasWidth > canvasHeight ? canvasHeight : canvasWidth;

    function createPath(ctx: CanvasRenderingContext2D, value: number, index: number) {
        const angle = ((360 * index) / volumesLength) * (Math.PI / 180) + Math.PI;

        const startX = halfWidth + Math.sin(angle) * spacing;
        const startY = halfHeight + Math.cos(angle) * spacing;

        const lineLength = spacing + (value * (shorterSideLength / 2 - 20)) / 255;

        const endX = halfWidth + Math.sin(angle) * lineLength;
        const endY = halfHeight + Math.cos(angle) * lineLength;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = `hsl(${180 - (180 * value) / 255}, 100%, 50%)`;
        ctx.stroke();
    }

    export function render() {
        context.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

        volumes.forEach((volume, i) => createPath(context, volume, i));
    }

    function setCanvasSize() {
        canvasWidth = canvas.offsetWidth;
        canvasHeight = canvas.offsetHeight;
    }

    onMount(() => {
        context = canvas.getContext('2d');

        setCanvasSize();
    });
</script>

<svelte:window on:resize={setCanvasSize} />

<canvas bind:this={canvas} width={canvasWidth} height={canvasHeight} />

<style lang="scss">
    canvas {
        width: 100%;
        height: calc(100vh - 80px);
    }
</style>
