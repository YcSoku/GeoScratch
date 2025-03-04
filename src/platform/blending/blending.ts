export const NormalBlending: GPUBlendState = {
    color: {
        operation: "add",
        srcFactor: "src-alpha",
        dstFactor: "one-minus-src-alpha"
    },
    alpha: {
        operation: "add",
        srcFactor: "one",
        dstFactor: "one-minus-src-alpha"
    }
}

export const AdditiveBlending: GPUBlendState = {
    color: {
        operation: 'add',
        srcFactor: 'src-alpha',
        dstFactor: 'one'
    },
    alpha: {
        operation: 'add',
        srcFactor: 'src-alpha',
        dstFactor: 'one'
    }
}

export const NoBlending: GPUBlendState = {
    color: {
        operation: 'add',
        srcFactor: 'one',
        dstFactor: 'zero'
    },
    alpha: {
        operation: 'add',
        srcFactor: 'one',
        dstFactor: 'zero'
    }
}

export const PremultipliedBlending: GPUBlendState = {
    color: {
        operation: 'add',
        srcFactor: 'one',
        dstFactor: 'one-minus-src-alpha'
    },
    alpha: {
        operation: 'add',
        srcFactor: 'one',
        dstFactor: 'one-minus-src-alpha'
    }
}