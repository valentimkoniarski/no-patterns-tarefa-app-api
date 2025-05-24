import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  ParseIntPipe,
  Patch,
  Query,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import { TarefaDto, TarefaService, FilterOp } from './tarefa.service';

@Controller('tarefas')
export class TarefaController {
  constructor(private readonly tarefaService: TarefaService) {}

  @Get()
  async listarTarefas(
    @Query('pagina', new DefaultValuePipe(1), ParseIntPipe) pagina: number,
    @Query('limite', new DefaultValuePipe(10), ParseIntPipe) limite: number,
    @Query('filtros') filtrosJson?: string,
  ) {
    let filtros: FilterOp[] | undefined;
    if (filtrosJson) {
      try {
        filtros = JSON.parse(filtrosJson) as FilterOp[];
      } catch {
        throw new BadRequestException('Formato de filtros inválido');
      }
    }
    return this.tarefaService.listarTarefas(pagina, limite, filtros);
  }

  @Get(':id/detalhes')
  tarefaDetalhes(@Param('id', ParseIntPipe) id: number) {
    return this.tarefaService.tarefaDetalhes(id);
  }

  @Post()
  criar(@Body() dto: TarefaDto) {
    return this.tarefaService.criarTarefa(dto);
  }

  @Post(':id/clonar')
  clonar(@Param('id', ParseIntPipe) id: number, @Body() dto?: TarefaDto) {
    return this.tarefaService.clonarTarefa(id, dto);
  }

  @Put(':id')
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: TarefaDto) {
    return this.tarefaService.atualizarTarefa(id, dto);
  }

  @Patch(':id/iniciar')
  iniciar(@Param('id', ParseIntPipe) id: number) {
    return this.tarefaService.iniciarTarefa(id);
  }

  @Patch(':id/concluir')
  concluir(@Param('id', ParseIntPipe) id: number) {
    return this.tarefaService.concluirTarefa(id);
  }

  @Delete(':id')
  apagar(@Param('id', ParseIntPipe) id: number) {
    return this.tarefaService.apagarTarefa(id);
  }
}
