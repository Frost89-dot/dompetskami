export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { periode, kategoriId, nominalAnggaran, dibuatOleh } = body
    
    // Validasi input (sama seperti di atas)
    if (!periode || !kategoriId || nominalAnggaran === undefined) {
      return NextResponse.json(
        { error: 'Periode, kategori, dan nominal anggaran wajib diisi' }, 
        { status: 400 }
      )
    }
    
    if (typeof nominalAnggaran !== 'number' || nominalAnggaran <= 0) {
      return NextResponse.json(
        { error: 'Nominal anggaran harus berupa angka positif' }, 
        { status: 400 }
      )
    }
    
    // Gunakan transaction untuk atomic operation
    const result = await db.$transaction(async (tx) => {
      // Cek existing
      const existing = await tx.anggaran.findFirst({
        where: { 
          periode: periode, 
          kategoriId: kategoriId 
        },
      })
      
      let budget
      let isNew = false
      
      if (existing) {
        // Update existing
        budget = await tx.anggaran.update({
          where: { id: existing.id },
          data: { 
            nominalAnggaran: nominalAnggaran,
            ...(dibuatOleh && { dibuatOleh }),
          },
          include: { kategori: true },
        })
      } else {
        // Create new
        isNew = true
        budget = await tx.anggaran.create({
          data: {
            periode,
            kategoriId,
            nominalAnggaran,
            dibuatOleh: dibuatOleh || 'system@dompetkami.com',
          },
          include: { kategori: true },
        })
      }
      
      return { budget, isNew }
    })
    
    return NextResponse.json({ 
      success: true, 
      data: result.budget,
      message: result.isNew ? 'Anggaran berhasil dibuat' : 'Anggaran berhasil diperbarui',
      isNew: result.isNew,
    }, { status: result.isNew ? 201 : 200 })
    
  } catch (error) {
    console.error('Error creating/updating budget:', error)
    return NextResponse.json(
      { error: 'Gagal menyimpan anggaran' }, 
      { status: 500 }
    )
  }
}
